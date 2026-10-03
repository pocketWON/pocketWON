#!/usr/bin/env python3
"""Pack individually generated PocketWON frames; art is never synthesized here."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'ks6s3juocjzc2.kimi.page'
SOURCE = ROOT / 'sprite-source'
OUT = APP / 'assets/pocketwon/sprites'
EVIDENCE = ROOT / 'evidence/SPRITE-MOTION'
PROFILES = ('balance', 'record', 'report', 'goal', 'all', 'success')
IDLE = ['neutral', 'glance', 'half', 'blink', 'glance', 'neutral']
ACTION = ['neutral', 'prepare', 'anticipate', 'peak', 'follow', 'settle', 'return', 'neutral']
SUCCESS = ['neutral', 'crouch', 'raise', 'lift', 'apex', 'drift', 'land', 'recover', 'settle', 'neutral']
SIZE = 384

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def encode(image, stem):
    png, webp = stem.with_suffix('.png'), stem.with_suffix('.webp')
    image.save(png, optimize=True)
    image.save(webp, lossless=True, quality=100, method=6, exact=True)
    sizes = {'png': png.stat().st_size, 'losslessWebp': webp.stat().st_size}
    chosen = min((png, webp), key=lambda p: p.stat().st_size)
    decoded = Image.open(chosen).convert('RGBA')
    # Ignore invisible RGB under alpha=0. Check every visible channel exactly.
    for expected, actual in zip(image.getdata(), decoded.getdata()):
        assert expected[3] == actual[3] and (not expected[3] or expected == actual), 'Lossless encode changed visible pixels'
    for unused in (png, webp):
        if unused != chosen:
            unused.unlink()
    return chosen, sizes

def build(partial=False):
    OUT.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    registry, evidence = {}, []
    for name in PROFILES:
        neutral = SOURCE / 'frames' / name / 'neutral.png'
        if not neutral.exists():
            if partial: continue
            raise FileNotFoundError(neutral)
        poster, poster_sizes = encode(Image.open(neutral).convert('RGBA').resize((384, 384), Image.Resampling.LANCZOS), OUT / f'pocketwon-{name}-poster')
        profile = {'poster': './assets/pocketwon/sprites/' + poster.name,
                   'fallback': f'./assets/pocketwon/characters/pocketwon-mascot-{name}.png', 'clips': {}}
        sequences = {'action': SUCCESS} if name == 'success' else {'idle': IDLE, 'action': ACTION}
        for clip, frames in sequences.items():
            paths = [SOURCE / 'frames' / name / (frame + '.png') for frame in frames]
            if partial and not all(path.exists() for path in paths): continue
            sheet = Image.new('RGBA', (SIZE * len(frames), SIZE))
            contact = Image.new('RGB', (160 * len(frames), 184), '#D9EEFB')
            draw = ImageDraw.Draw(contact)
            records = []
            for index, path in enumerate(paths):
                im = Image.open(path).convert('RGBA')
                provenance = json.loads((SOURCE / 'prompts' / name / (path.stem + '.json')).read_text())
                assert provenance['tool'] == 'built-in image_gen', f'Missing AI provenance: {path}'
                assert provenance['sourceSha256'] == digest(path), f'Source changed after import: {path}'
                assert im.size == (512, 512), f'Canvas unlocked: {path}'
                alpha = im.getchannel('A')
                assert alpha.getextrema() == (0, 255), f'Missing transparency or white opacity: {path}'
                assert all(alpha.getpixel(p) == 0 for p in ((0,0),(511,0),(0,511),(511,511))), f'Opaque canvas corner: {path}'
                cell = im.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
                sheet.paste(cell, (index * SIZE, 0))
                small = im.resize((160, 160), Image.Resampling.LANCZOS)
                contact.paste(small, (index * 160, 0), small)
                draw.text((index * 160 + 6, 164), f'{index + 1}: {path.stem}', fill='#29313F')
                records.append({'frame': index, 'pose': path.stem, 'source': str(path.relative_to(ROOT)), 'sha256': digest(path)})
            result, sizes = encode(sheet, OUT / f'pocketwon-{name}-{clip}-sprite')
            decoded = Image.open(result).convert('RGBA')
            # Packing must round-trip every cell exactly, not merely match dimensions.
            for index, path in enumerate(paths):
                expected = Image.open(path).convert('RGBA').resize((SIZE, SIZE), Image.Resampling.LANCZOS)
                actual = decoded.crop((index * SIZE, 0, (index + 1) * SIZE, SIZE))
                assert all(a[3] == b[3] and (not a[3] or a == b) for a, b in zip(expected.getdata(), actual.getdata()))
            fps = 6 if clip == 'idle' else 10
            meta = {'src': './assets/pocketwon/sprites/' + result.name,
                    'poster': profile['poster'], 'frameWidth': SIZE, 'frameHeight': SIZE,
                    'frameCount': len(frames), 'fps': fps, 'loop': False,
                    'anchor': {'x': 192, 'y': 315}, 'bytes': result.stat().st_size}
            profile['clips'][clip] = meta
            evidence.append({'profile': name, 'clip': clip, **meta, 'dimensions': list(sheet.size),
                             'decodedBytes': sheet.width * sheet.height * 4, 'encodings': sizes,
                             'sha256': digest(result), 'sources': records,
                             'uniqueSourceFrames': len(set(frames)), 'verifiedCellEquality': True})
            contact.save(EVIDENCE / f'contact-{name}-{clip}.png')
        if profile['clips']:
            registry[name] = profile
    text = json.dumps(registry, ensure_ascii=False, indent=2)
    (APP / 'scripts/sprite-manifest.js').write_text('/* Generated by scripts/build-sprites.py from individually AI-generated frames. */\nconst PW_SPRITE_PROFILES = Object.freeze(' + text + ');\n')
    (SOURCE / 'manifest.json').write_text(json.dumps({'canvas': [512,512], 'serviceCell': [SIZE,SIZE], 'profiles': registry, 'sequences': evidence}, ensure_ascii=False, indent=2) + '\n')
    (EVIDENCE / 'assets.json').write_text(json.dumps({'complete': not partial, 'sheets': len(evidence), 'totalBytes': sum(v['bytes'] for v in evidence), 'assets': evidence}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'profiles': list(registry), 'sheets': len(evidence), 'bytes': sum(v['bytes'] for v in evidence)}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--partial', action='store_true', help='Build only finished sequences for checkpoint playback')
    build(parser.parse_args().partial)
