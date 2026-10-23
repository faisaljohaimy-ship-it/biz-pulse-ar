#!/bin/bash
# تصيير فيلم التوأم v3 على دفعات (متصفّحٌ جديد لكلّ دفعة) ثم ضغط كلّ دفعة PNG إلى وسيطٍ شبه لا فقديّ
# (H.264 crf 6 بعد تحويل RGB ← BT.709 مدى تلفزيوني) — FFV1 على صورٍ فوتوغرافية ≈ 1 MB/إطار (1.7 GB للفيلم) فلم يُعتمد.
# usage: render-chunks.sh <مجلّد البناء> <مجلّد الخرج> [من=0] [إلى=1679] [حجم الدفعة=120] [التزامن=4]
BUILD=$1; OUT=$2; FROM=${3:-0}; TO=${4:-1679}; CH=${5:-120}; CONC=${6:-4}
cd "$BUILD" || exit 1
H=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | head -1)
V="scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p"
mkdir -p "$OUT"
for ((a=FROM; a<=TO; a+=CH)); do
  b=$((a+CH-1)); [ $b -gt $TO ] && b=$TO; n=$((b-a+1))
  for try in 1 2 3 4; do
    [ -f "$OUT/c_$(printf %04d $a).mkv" ] && break
    rm -rf "${OUT}_tmp"
    npx remotion render twin3/index.tsx TwinFilmV3 "${OUT}_tmp" --sequence --image-format=png --gl=swiftshader \
      --browser-executable="$H" --concurrency=$CONC --frames=$a-$b --public-dir=public-tw3 > "$OUT.chunk.log" 2>&1
    if [ "$(ls "${OUT}_tmp"/*.png 2>/dev/null | wc -l)" = "$n" ]; then
      ffmpeg -loglevel error -y -framerate 30 -pattern_type glob -i "${OUT}_tmp/element-*.png" -vf "$V" \
        -c:v libx264 -preset fast -crf 6 -x264-params keyint=30 -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
        "$OUT/c_$(printf %04d $a).mkv"
    fi
  done
  rm -rf "${OUT}_tmp"
done
