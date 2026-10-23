#!/usr/bin/env python3
"""Snap hand-placed lanes (rough polylines in photo pixels) onto the nearest ridge of the photo.
mode 'bright' = glowing cable on dark sky; 'dark' = dark cable on lighter sky; 'abs' = either.
usage: snap.py <photo.jpg> <lanes.json> <out.json> <bright|dark> [R=8]"""
import json, sys, numpy as np
from PIL import Image, ImageFilter
photo, lanes_f, out_f, mode = sys.argv[1:5]
R = float(sys.argv[5]) if len(sys.argv) > 5 else 8
lanes = json.load(open(lanes_f))
g = Image.open(photo).convert("L")
a = np.asarray(g, np.float64)
hp = a - np.asarray(g.filter(ImageFilter.GaussianBlur(6)), np.float64)
wire = np.clip(hp if mode == "bright" else (-hp if mode == "dark" else np.abs(hp)), 0, None)
def samp(x, y):
    x = np.clip(x, 0, a.shape[1] - 1.001); y = np.clip(y, 0, a.shape[0] - 1.001)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = x - x0; fy = y - y0
    return wire[y0, x0]*(1-fx)*(1-fy) + wire[y0, x0+1]*fx*(1-fy) + wire[y0+1, x0]*(1-fx)*fy + wire[y0+1, x0+1]*fx*fy
def cr(pts, per=40):
    P = [pts[0]] + pts + [pts[-1]]; o = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i-1], P[i], P[i+1], P[i+2]
        for j in range(per):
            u = j / per
            f = lambda a_, b, c, d: 0.5*(2*b + (-a_+c)*u + (2*a_-5*b+4*c-d)*u*u + (-a_+3*b-3*c+d)*u**3)
            o.append((f(p0[0],p1[0],p2[0],p3[0]), f(p0[1],p1[1],p2[1],p3[1])))
    o.append(tuple(pts[-1])); return np.array(o)
out = {}
for k, v in lanes.items():
    if k.startswith("_"): continue
    P = cr(v)
    seg = np.hypot(*np.diff(P, axis=0).T); s = np.concatenate([[0], np.cumsum(seg)])
    n = max(int(s[-1] / 3), 2); ts = np.linspace(0, s[-1], n)
    X = np.interp(ts, s, P[:, 0]); Y = np.interp(ts, s, P[:, 1])
    dx = np.gradient(X); dy = np.gradient(Y); L = np.hypot(dx, dy) + 1e-9
    nx, ny = -dy / L, dx / L
    offs = np.arange(-R, R + 0.01, 0.5)
    best = np.zeros(n); conf = np.zeros(n)
    for i in range(n):
        sc = np.array([sum(samp(X[i] + nx[i]*o + dx[i]/L[i]*t, Y[i] + ny[i]*o + dy[i]/L[i]*t) for t in (-6, -3, 0, 3, 6)) / 5 for o in offs])
        j = int(np.argmax(sc)); best[i] = offs[j]; conf[i] = sc[j] - np.median(sc)
    best = np.where(conf > 2.0, best, np.nan)
    idx = np.arange(n); ok = ~np.isnan(best)
    best = np.interp(idx, idx[ok], best[ok]) if ok.sum() > 3 else np.zeros(n)
    w = 25; sm = np.convolve(np.pad(best, (w//2, w//2), mode="edge"), np.ones(w)/w, mode="valid")
    Xs = X + nx*sm; Ys = Y + ny*sm
    step = 3
    pts = [[round(float(Xs[i]),1), round(float(Ys[i]),1)] for i in range(0, n, step)]
    last = [round(float(Xs[-1]),1), round(float(Ys[-1]),1)]
    if pts[-1] != last: pts.append(last)
    out[k] = pts
    print(k, len(pts), "mean|off|", round(float(np.abs(sm).mean()),2))
json.dump(out, open(out_f, "w"))
