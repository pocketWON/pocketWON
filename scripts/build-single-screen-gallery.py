#!/usr/bin/env python3
"""Build a review gallery from one successfully completed acceptance run."""
import argparse
import html
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / 'evidence/SINGLE-SCREEN/index.html'


def build(run):
    report = json.loads((run / 'verification.json').read_text())
    assert report['status'] == 'PASS' and not report['errors'], 'Only a successful run can be published in this gallery'
    relative = Path(os.path.relpath(run, DESTINATION.parent)).as_posix()
    cards = []
    labels = {'home': '홈', 'record': '기록', 'goal': '목표', 'report': '리포트', 'all': '전체'}
    for engine in ('chromium', 'webkit'):
        for screen, label in labels.items():
            figures = []
            for width, height in ((320, 568), (390, 844), (430, 932)):
                for motion, description in (('motion', '일반 모션'), ('reduce', 'reduced-motion')):
                    filename = f'{engine}-{screen}-{width}-{motion}.png'
                    assert (run / 'screenshots' / filename).is_file(), filename
                    figures.append(f'<figure><figcaption>{width}×{height} · {description}</figcaption><a href="{relative}/screenshots/{filename}"><img src="{relative}/screenshots/{filename}" width="{width}" height="{height}" loading="lazy" alt="{engine} {label} {width}×{height} {description}"></a></figure>')
            cards.append(f'<section id="{engine}-{screen}"><h2>{engine} · {label}</h2><div class="comparison">{"".join(figures)}</div></section>')
    geometry = len(report['geometry'])
    document = f'''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PocketWON 단일 화면 검증</title>
<style>body{{margin:0;padding:24px;font:16px/1.5 system-ui;color:#29313f;background:#fafcfd}}main{{max-width:1500px;margin:auto}}h1{{font-size:28px}}h2{{font-size:20px}}a{{color:#0069b7}}.comparison{{display:grid;grid-template-columns:repeat(6,minmax(150px,1fr));gap:12px;align-items:start}}figure{{margin:0}}figcaption{{font-size:12px;margin-bottom:8px}}img{{display:block;width:100%;height:auto;border-radius:12px;border:1px solid #dce5ec}}section{{margin:32px 0}}nav{{display:flex;gap:12px;flex-wrap:wrap}}@media(max-width:900px){{.comparison{{grid-template-columns:repeat(2,minmax(0,1fr))}}}}</style>
<main><h1>PocketWON 단일 화면 검증</h1><p>Chromium·WebKit · {len(report['checks'])}개 검사 PASS · {geometry}개 화면 경계 검사 · 페이지 오류 0건</p><p>스크린샷은 독립된 테스트 컨텍스트의 합성 저장 데이터입니다. 일반 모션은 등장 효과가 끝난 상태를 촬영했습니다. 실제 모바일 키보드는 검증하지 않았으며 VisualViewport로 입력 공간을 검사했습니다.</p><p><a href="{relative}/verification.json">전체 검사 결과</a> · <a href="../../docs/POCKETWON-SINGLE-SCREEN.md">구조·보존 보고서</a> · <a href="../../ks6s3juocjzc2.kimi.page/index.html">실행 앱</a></p><nav>{''.join(f'<a href="#{engine}-{screen}">{engine} {label}</a>' for engine in ('chromium','webkit') for screen,label in labels.items())}</nav>{''.join(cards)}<p>검증 실행: {html.escape(run.name)}</p></main></html>'''
    DESTINATION.write_text(document, encoding='utf-8')
    print(DESTINATION)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run', type=Path)
    build(parser.parse_args().run.resolve())
