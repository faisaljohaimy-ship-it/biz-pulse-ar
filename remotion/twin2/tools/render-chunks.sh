#!/bin/bash
# تصيير الفيلم على دفعات (90 إطارًا) — متصفّح جديد لكلّ دفعة — ثم ضغط كلّ دفعة PNG إلى FFV1 بلا فقد.
# السبب: تشغيلٌ واحد طويل ينهار فيه المتصفّح (target-closed) بعد عشرات الإطارات في هذه البيئة، ومساحة القرص ضيّقة.
# usage: render-chunks.sh <مجلّد البناء> <مجلّد الخرج> [من=0] [إلى=1679] [حجم الدفعة=90] [التزامن=4]
BUILD=$1; OUT=$2; FROM=${3:-0}; TO=${4:-1679}; CH=${5:-90}; CONC=${6:-4}
cd "$BUILD" || exit 1
H=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | head -1)
mkdir -p "$OUT"
for ((a=FROM; a<=TO; a+=CH)); do
  b=$((a+CH-1)); [ $b -gt $TO ] && b=$TO; n=$((b-a+1))
  for try in 1 2 3 4; do
    [ -f "$OUT/c_$(printf %04d $a).mkv" ] && break
    rm -rf "${OUT}_tmp"
    npx remotion render twin2/index.tsx TwinFilmV2 "${OUT}_tmp" --sequence --image-format=png --gl=swiftshader \
      --browser-executable="$H" --concurrency=$CONC --frames=$a-$b --public-dir=public > "$OUT.chunk.log" 2>&1
    if [ "$(ls "${OUT}_tmp"/*.png 2>/dev/null | wc -l)" = "$n" ]; then
      ffmpeg -loglevel error -y -framerate 30 -pattern_type glob -i "${OUT}_tmp/element-*.png" -c:v ffv1 -level 3 -g 1 -pix_fmt bgr0 "$OUT/c_$(printf %04d $a).mkv"
    fi
  done
  rm -rf "${OUT}_tmp"
done
