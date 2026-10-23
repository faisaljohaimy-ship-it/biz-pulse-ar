#!/usr/bin/env python3
"""Draw lanes (json) over a photo crop. usage: overlay.py <photo> <lanes.json> x0 y0 x1 y1 scale out.png"""
import json, sys
from PIL import Image, ImageDraw
photo, lj = sys.argv[1:3]; x0, y0, x1, y1 = map(int, sys.argv[3:7]); sc = float(sys.argv[7]); out = sys.argv[8]
L = json.load(open(lj))
im = Image.open(photo).convert("RGB").crop((x0,y0,x1,y1)); im = im.resize((int(im.width*sc), int(im.height*sc)), Image.LANCZOS)
d = ImageDraw.Draw(im)
cols = [(255,60,60),(60,255,60),(255,255,0),(255,0,255),(0,255,255),(255,160,0),(160,160,255),(255,255,255),(255,100,180)]
for i,(k,v) in enumerate(L.items()):
    if k.startswith("_"): continue
    pts = [((x-x0)*sc,(y-y0)*sc) for x,y in v]
    d.line(pts, fill=cols[i%len(cols)], width=2); d.text(pts[0], k, fill=cols[i%len(cols)])
im.save(out)
