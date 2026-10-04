#!/usr/bin/env python3
"""Build comparison-only evidence. No reference pixels are used in application UI."""
from pathlib import Path
from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageDraw, ImageStat
import json, hashlib, subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence/PIXEL-FIDELITY'
APP = ROOT / 'ks6s3juocjzc2.kimi.page'
REFERENCE = OUT / 'reference/normalized-390.png'
ref = Image.open(REFERENCE).convert('RGB')
# Polygon silhouettes trace only the reference mascots/props, not their cards.
polygons = [
 [(237,225),(231,214),(230,200),(235,192),(241,191),(248,178),(246,167),(247,153),(253,140),(267,131),(270,128),(269,122),(273,115),(281,112),(287,114),(291,107),(297,106),(304,110),(308,121),(320,121),(332,126),(342,135),(350,149),(353,163),(352,175),(345,187),(338,192),(344,205),(350,225)],
 [(311,599),(308,589),(308,581),(304,576),(303,565),(309,562),(309,554),(315,548),(324,545),(330,541),(338,542),(347,551),(353,556),(355,566),(363,567),(371,572),(370,580),(363,585),(360,593),(360,599)],
 [(151,730),(145,726),(144,717),(146,709),(151,707),(152,699),(158,689),(166,685),(171,681),(175,681),(179,685),(184,685),(188,690),(190,697),(194,704),(195,712),(190,718),(190,729),(181,733),(170,729),(162,734)],
 [(342,44),(340,37),(340,28),(344,23),(348,22),(349,17),(354,15),(358,20),(363,21),(367,26),(369,34),(365,42),(362,46),(350,46)],
]
mask = Image.new('L', ref.size, 255)
draw = ImageDraw.Draw(mask)
for polygon in polygons: draw.polygon(polygon, fill=0)
geometry_file = OUT / 'passes/final-geometry.json'
if geometry_file.exists():
    geometry = json.loads(geometry_file.read_text())
    for sprite in geometry['sprites']:
        poster = APP / 'assets/pocketwon/sprites' / f"pocketwon-{sprite['profile']}-poster.webp"
        alpha = Image.open(poster).convert('RGBA').getchannel('A')
        b = sprite['box']
        alpha = alpha.resize((round(b['width']), round(b['height'])), Image.Resampling.LANCZOS)
        alpha = alpha.point(lambda value: 255 if value > 8 else 0)
        layer = Image.new('L', ref.size, 0)
        layer.paste(alpha, (round(b['x']), round(b['y'])))
        mask = ImageChops.subtract(mask, layer)
    # Two pixels of antialias fringe; still no entire panel excluded.
    mask = mask.filter(ImageFilter.MinFilter(5))
mask.save(OUT / 'reference/appearance-mask.png')

def mae(a, b, m=None):
    return sum(ImageStat.Stat(ImageChops.difference(a,b), m).mean) / 3

results = []
for file in sorted((OUT/'passes').glob('*.png')):
    if 'stored-data' in file.name or 'empty' in file.name or 'motion' in file.name: continue
    current = Image.open(file).convert('RGB').crop((0,0,390,824))
    name = file.stem
    Image.blend(ref,current,.5).save(OUT/'passes'/f'{name}-overlay.webp')
    side = Image.new('RGB',(780,824),'white');side.paste(ref,(0,0));side.paste(current,(390,0))
    side.save(OUT/'passes'/f'{name}-comparison.webp')
    difference = ImageChops.difference(ref,current)
    ImageEnhance.Contrast(difference).enhance(3).save(OUT/'passes'/f'{name}-difference.webp')
    raw=mae(ref,current)
    blur=mae(ref.filter(ImageFilter.GaussianBlur(5)),current.filter(ImageFilter.GaussianBlur(5)))
    item={'pass':name,'mean_absolute_RGB_error_0_to_255':round(raw,3),'normalized_RGB_similarity_percent':round(100*(1-raw/255),3),'blur5_RGB_similarity_percent':round(100*(1-blur/255),3)}
    if name=='final-reference':
        masked=mae(ref,current,mask)
        item.update({'character_masked_RGB_similarity_percent':round(100*(1-masked/255),3),'mask_included_fraction':round(ImageStat.Stat(mask).mean[0]/255,4)})
    results.append(item)
(OUT/'comparison-metrics.json').write_text(json.dumps({'method':'RGB similarity = 100*(1-mean absolute channel error/255). This is not perceptual fidelity or a claim of pixel identity. Blur radius=5 CSS pixels. Final appearance mask excludes traced reference/actual mascot silhouettes and 2px antialias fringe, not entire cards. All frames and character layout are verified separately.','results':results},ensure_ascii=False,indent=2)+'\n')
# Repository sources were clean at start apart from unrelated user files. Record HEAD baseline,
# rather than accidentally capturing a concurrently edited worker file as the initial state.
tracked=subprocess.check_output(['git','ls-tree','-r','--name-only','HEAD','ks6s3juocjzc2.kimi.page'],cwd=ROOT,text=True).splitlines()
baseline={name:hashlib.sha256(subprocess.check_output(['git','show','HEAD:'+name],cwd=ROOT)).hexdigest() for name in tracked}
(OUT/'baseline.json').write_text(json.dumps(baseline,indent=2)+'\n')
print(json.dumps(results[-2:],indent=2))
