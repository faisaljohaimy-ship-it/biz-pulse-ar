"""Render the 60-second introduction locally; no paid service or runtime rendering.

Requires ffmpeg with libass. The existing brand film depicts illustrative facilities.
Optional --audio must be an approved recording of the canonical SADEED voice.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SCENES = [
    ("SADEED", "سَدِيد", "منظومة القرار والإنجاز الذكي", "قرار أدق. إنجاز أسرع."),
    ("ONE CLEAR VIEW", "الصورة كاملة… أمامك", "العمليات والبلاغات والصيانة في مساحة واحدة", "من المعلومة إلى المتابعة"),
    ("CONNECTED OPERATIONS", "كل مهمة لها مسار", "تصاريح العمل • المخاطر • التقارير التشغيلية", "وضوح في المسؤوليات والمتابعة"),
    ("YOUR INTELLIGENT ASSISTANT", "اسأل سَدِيد", "مساعدك لفهم المعلومات وتلخيصها", "بالعربية… وفي سياق عملك"),
    ("FNN · AUTOMATION", "خطّط مع fnn", "تنسيق المسارات وربط اختصاصات الوكلاء", "الأتمتة تقترح… وصاحب الصلاحية يعتمد"),
    ("SMARTER DECISIONS", "من الرؤية إلى الإنجاز", "سَدِيد | منظومة القرار والإنجاز الذكي", "ابدأ الآن"),
]


def run(args):
    subprocess.run(args, check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", type=Path)
    args = parser.parse_args()
    if args.audio:
        duration = float(subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=nw=1:nk=1", str(args.audio),
        ]))
        if not 45 <= duration <= 59:
            raise SystemExit("Narration must last 45–59 seconds; never truncate speech.")
    with tempfile.TemporaryDirectory(prefix="sadeed-intro-") as temp:
        ass = Path(temp) / "intro.ass"
        header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1608
PlayResY: 904
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Main,DejaVu Sans,64,&H00FFFFFF,&H00FFFFFF,&H00201408,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,50,50,30,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        events = []
        for i, lines in enumerate(SCENES):
            start, end = i * 10, (i + 1) * 10
            for j, (line, y, size, colour) in enumerate(zip(
                lines, [105, 235, 340, 812], [22, 74, 32, 27],
                ["&HE7D17D&", "&HFFFFFF&", "&HEFE7D9&", "&HE7D17D&"],
            )):
                tag = "{\\an5\\move(804,%d,804,%d,0,1200)\\fs%d\\c%s\\fad(550,500)}" % (y+18, y, size, colour)
                events.append(f"Dialogue: 0,0:00:{start:05.2f},0:01:00.00,Main,,0,0,0,,{tag}{line}\n" if end == 60 else
                              f"Dialogue: 0,0:00:{start:05.2f},0:00:{end:05.2f},Main,,0,0,0,,{tag}{line}\n")
        events.append("Dialogue: 1,0:00:00.00,0:01:00.00,Main,,0,0,0,,{\\an5\\pos(804,862)\\fs16\\c&HAFA999&}مشاهد توضيحية • لا تمثّل بيانات تشغيلية حيّة\n")
        ass.write_text(header + "".join(events))
        target = ROOT / "public/media/sadeed-intro-60.mp4"
        command = ["ffmpeg", "-y", "-v", "warning", "-stream_loop", "-1", "-i",
                   str(ROOT / "public/media/brand/sadeed-film-1608.mp4")]
        if args.audio:
            command += ["-i", str(args.audio)]
        command += ["-vf", f"scale=1608:536,pad=1608:904:0:368:color=0x081420,drawbox=x=0:y=780:w=iw:h=124:color=0x081420@0.85:t=fill,ass={ass}",
                    "-t", "60", "-r", "30", "-c:v", "libx264", "-preset", "fast", "-crf", "24", "-threads", "2", "-pix_fmt", "yuv420p"]
        command += ["-af", "apad", "-c:a", "aac", "-b:a", "128k"] if args.audio else ["-an"]
        command += ["-movflags", "+faststart", str(target)]
        run(command)
        run(["ffmpeg", "-y", "-v", "error", "-ss", "2", "-i", str(target), "-frames:v", "1",
             str(ROOT / "public/media/sadeed-intro-poster.webp")])
        (ROOT / "public/media/sadeed-intro-status.json").write_text(json.dumps({
            "durationSeconds": 60, "hasNarration": bool(args.audio),
            "voice": "canonical-sadeed" if args.audio else None,
        }) + "\n")


if __name__ == "__main__":
    main()
