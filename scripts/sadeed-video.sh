#!/usr/bin/env bash
# =============================================================================
# سَدِيد — خطّ معالجة فيديو الترحيب (قابل لإعادة التشغيل)
#
#   ./scripts/sadeed-video.sh inspect              تقرير ffprobe للمصدر والمخرج
#   ./scripts/sadeed-video.sh brand                إعادة بناء طبقة الهوية + التصدير
#   ./scripts/sadeed-video.sh swap-voice <mp3>     استبدال الصوت بطول الفيديو الكامل (بوابة ±1s)
#   ./scripts/sadeed-video.sh fit-voice  <mp3>      قرار المالك ٢٠٢٦/٠٨/١١: قصّ الفيديو ليطابق الصوت
#
# ملاحظة صدق: طبقة الهوية تغطّي علامة HeyGen ولا تمحوها من البكسلات؛
# الفيديو النظيف الوحيد هو إعادة توليده من HeyGen بخطة مدفوعة.
# =============================================================================
set -euo pipefail

# ---- مسارات قابلة للتجاوز عبر البيئة -----------------------------------------
SCRATCH_DEFAULT="/tmp/claude-0/-home-user-biz-pulse-ar/0301aa7d-cf75-50cc-ae22-43ff10e7865b/scratchpad"
SCRATCH="${SCRATCH:-$SCRATCH_DEFAULT}"
FFMPEG="${FFMPEG:-$SCRATCH/av/node_modules/ffmpeg-static/ffmpeg}"
FFPROBE="${FFPROBE:-$SCRATCH/av/node_modules/ffprobe-static/bin/linux/x64/ffprobe}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="${SOURCE:-$SCRATCH/video/source.mp4}"
OVERLAY_DIR="${OVERLAY_DIR:-$SCRATCH/video/overlay}"
OVERLAY_PNG="$OVERLAY_DIR/overlay.png"
OUT="${OUT:-$REPO_ROOT/public/sadeed-welcome.mp4}"
PW_BROWSERS="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"

# عقد الصوت (من BRIEF): أول كلمة عند 2.236s، مدة الكلام الأصلي 48.3s
SPEECH_START_MS=2236
SPEECH_DUR=48.3
DUR_TOLERANCE=1.0
SIZE_CAP_BYTES=$((12 * 1024 * 1024))   # 12MiB

probe_one() { # $1 label  $2 file
  if [[ ! -f "$2" ]]; then echo "— $1: غير موجود ($2)"; return; fi
  echo "── $1: $2"
  "$FFPROBE" -v error \
    -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels \
    -of default=noprint_wrappers=1 "$2"
  echo
}

cmd_inspect() {
  probe_one "المصدر" "$SOURCE"
  probe_one "المخرج" "$OUT"
}

build_overlay() {
  echo "▶ بناء طبقة الهوية (Playwright/Chromium)…"
  PLAYWRIGHT_BROWSERS_PATH="$PW_BROWSERS" node "$OVERLAY_DIR/capture.mjs"
  [[ -f "$OVERLAY_PNG" ]] || { echo "🛑 فشل بناء $OVERLAY_PNG"; exit 1; }
}

export_branded() { # يجرّب CRF 23 ثم يرفع حتى ينزل تحت 12MiB
  for crf in 23 24 25 26; do
    echo "▶ تصدير CRF $crf …"
    "$FFMPEG" -y -v error \
      -i "$SOURCE" -i "$OVERLAY_PNG" \
      -filter_complex "[0:v][1:v]overlay=0:0:format=auto" \
      -c:v libx264 -preset slow -crf "$crf" -pix_fmt yuv420p \
      -c:a copy -movflags +faststart \
      "$OUT"
    local size
    size=$(stat -c%s "$OUT")
    echo "  الحجم: $size bytes ($(awk "BEGIN{printf \"%.2f\", $size/1048576}") MiB)"
    if (( size <= SIZE_CAP_BYTES )); then
      echo "✔ ضمن سقف 12MiB عند CRF $crf"
      return 0
    fi
  done
  echo "🛑 تجاوز 12MiB حتى مع CRF 26 — راجع يدويًّا"
  exit 1
}

cmd_brand() {
  [[ -f "$SOURCE" ]] || { echo "🛑 المصدر غير موجود: $SOURCE"; exit 1; }
  build_overlay
  export_branded
  cmd_inspect
}

cmd_swap_voice() { # $1 = sadeed.mp3
  local mp3="${1:-}"
  [[ -n "$mp3" && -f "$mp3" ]] || { echo "🛑 الاستعمال: swap-voice <sadeed.mp3>"; exit 1; }
  [[ -f "$OUT" ]] || { echo "🛑 المخرج غير موجود — شغّل brand أولًا"; exit 1; }

  local dur diff
  dur=$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$mp3")
  diff=$(awk "BEGIN{d=$dur-$SPEECH_DUR; if (d<0) d=-d; printf \"%.2f\", d}")
  if awk "BEGIN{exit !( $diff > $DUR_TOLERANCE )}"; then
    echo "🛑 عدم تطابق: فرق ${diff}s"
    echo "   قرار المالك ٢٠٢٦/٠٨/١١ لهذه الحال: القصّ يتبع الصوت — استعمل:"
    echo "   $0 fit-voice $mp3"
    exit 1
  fi
  echo "✔ مدة الصوت ${dur}s ضمن ±${DUR_TOLERANCE}s من ${SPEECH_DUR}s"

  local fade_out_st vid_dur tmp
  fade_out_st=$(awk "BEGIN{printf \"%.3f\", $dur-0.05}")
  vid_dur=$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$OUT")
  tmp="$(dirname "$OUT")/.sadeed-welcome.swap.mp4"

  # محاذاة البداية إلى 2.236s + fade ‏50ms دخولًا وخروجًا + استبدال كليّ للمسار.
  # apad بحدّ صريح whole_dur (لا apad مفتوح + -shortest مع نسخ الفيديو — يعلّق ffmpeg).
  "$FFMPEG" -y -v error \
    -i "$OUT" -i "$mp3" \
    -filter_complex "[1:a]afade=t=in:st=0:d=0.05,afade=t=out:st=${fade_out_st}:d=0.05,adelay=${SPEECH_START_MS}:all=1,apad=whole_dur=${vid_dur}[a]" \
    -map 0:v:0 -map "[a]" \
    -c:v copy -c:a aac -b:a 128k -ar 44100 -ac 2 \
    -movflags +faststart \
    "$tmp"
  mv "$tmp" "$OUT"
  echo "✔ استُبدل المسار الصوتي كليًّا (بداية عند ${SPEECH_START_MS}ms، fade ‏50ms)"
  cmd_inspect
}

# قرار المالك ٢٠٢٦/٠٨/١١ («قص الفيديو ليطابق النص»): القصّ مقودٌ بمدة
# الملف الصوتي الفعلية لا برقم مخمَّن — يقيس D ثم يقصّ الفيديو إلى
# (مقدّمة 2.236s حتى أول حركة شفاه) + D + (ذيل 1.2s) بتلاشٍ بصري 0.6s
# في الخاتمة. الصوت لا يُمطّ ولا يُقصّ — القصّ على الفيديو وحده.
cmd_fit_voice() { # $1 = sadeed.mp3
  local mp3="${1:-}"
  [[ -n "$mp3" && -f "$mp3" ]] || { echo "🛑 الاستعمال: fit-voice <sadeed.mp3>"; exit 1; }
  [[ -f "$OUT" ]] || { echo "🛑 المخرج غير موجود — شغّل brand أولًا"; exit 1; }

  local dur lead_s tail_s total vid_dur fade_v_st fade_a_st tmp
  dur=$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$mp3")
  lead_s=$(awk "BEGIN{printf \"%.3f\", $SPEECH_START_MS/1000}")
  tail_s=1.2
  vid_dur=$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$OUT")
  total=$(awk "BEGIN{t=$lead_s+$dur+$tail_s; if (t>$vid_dur) t=$vid_dur; printf \"%.3f\", t}")
  fade_v_st=$(awk "BEGIN{printf \"%.3f\", $total-0.6}")
  fade_a_st=$(awk "BEGIN{printf \"%.3f\", $dur-0.05}")
  tmp="$(dirname "$OUT")/.sadeed-welcome.fit.mp4"

  local src_fps
  src_fps=$("$FFPROBE" -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$OUT")

  echo "▶ قصّ الفيديو إلى ${total}s (مقدّمة ${lead_s}s + صوت ${dur}s + ذيل ${tail_s}s)…"
  # القصّ + تلاشي الخاتمة يحتاجان إعادة ترميز (النسخ لا يقصّ على غير مفاتيح
  # الإطارات ولا يطبّق fade). CRF 20 لمقطعٍ قصير — الحجم ينزل لا يرتفع.
  # `fps=` صريحة من المصدر: بدونها أسقط الترميز المعدل من 30 إلى 25 —
  # قِيس فعلًا (437 إطارًا بدل 524 على مقطع 17.48s) لا افتُرض.
  "$FFMPEG" -y -v error \
    -i "$OUT" -i "$mp3" \
    -filter_complex "[0:v]trim=0:${total},setpts=PTS-STARTPTS,fps=${src_fps},fade=t=out:st=${fade_v_st}:d=0.6[v];[1:a]afade=t=in:st=0:d=0.05,afade=t=out:st=${fade_a_st}:d=0.05,adelay=${SPEECH_START_MS}:all=1,apad=whole_dur=${total},atrim=0:${total}[a]" \
    -map "[v]" -map "[a]" \
    -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
    -c:a aac -b:a 128k -ar 44100 -ac 2 \
    -movflags +faststart \
    "$tmp"
  mv "$tmp" "$OUT"
  echo "✔ قُصّ الفيديو ليطابق الصوت — قرار المالك ٢٠٢٦/٠٨/١١"
  cmd_inspect
}

case "${1:-}" in
  inspect)     cmd_inspect ;;
  brand)       cmd_brand ;;
  swap-voice)  shift; cmd_swap_voice "${1:-}" ;;
  fit-voice)   shift; cmd_fit_voice "${1:-}" ;;
  *) echo "الاستعمال: $0 {inspect|brand|swap-voice <sadeed.mp3>|fit-voice <sadeed.mp3>}"; exit 1 ;;
esac
