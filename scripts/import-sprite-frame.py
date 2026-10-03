#!/usr/bin/env python3
"""Preserve an AI frame and normalize its entire canvas, never its content bbox."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('profile')
p.add_argument('frame')
p.add_argument('image')
p.add_argument('prompt')
p.add_argument('--references', nargs='*', default=[])
args = p.parse_args()
base = ROOT / 'sprite-source'
raw = base / 'raw' / args.profile / (args.frame + '.png')
out = base / 'frames' / args.profile / (args.frame + '.png')
meta = base / 'prompts' / args.profile / (args.frame + '.json')
for dest in (raw, out, meta):
    dest.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(args.image, raw)
im = Image.open(raw).convert('RGBA')
if im.width != im.height:
    raise ValueError('AI frame must have a square canvas; regenerate, do not crop')
original_size = im.size
# Eliminate near-invisible alpha noise from the generator; preserve real edges.
im.putalpha(im.getchannel('A').point(lambda v: 0 if v < 8 else v))
im = im.resize((512, 512), Image.Resampling.LANCZOS)
im.save(out)
meta.write_text(json.dumps({
    'profile': args.profile, 'frame': args.frame, 'tool': 'built-in image_gen',
    'prompt': Path(args.prompt).read_text(), 'references': args.references,
    'raw': str(raw.relative_to(ROOT)), 'source': str(out.relative_to(ROOT)),
    'generatedSize': original_size, 'canvas': [512, 512],
    'normalization': 'entire square resized; no content crop/translation',
    'alphaNoiseThreshold': 8,
    'rawSha256': hashlib.sha256(raw.read_bytes()).hexdigest(),
    'sourceSha256': hashlib.sha256(out.read_bytes()).hexdigest(),
}, ensure_ascii=False, indent=2) + '\n')
print(out)
