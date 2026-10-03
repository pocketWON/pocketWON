#!/usr/bin/env python3
"""Sync only the local static app mirror; never publish or alter historic releases."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'ks6s3juocjzc2.kimi.page'
MIRROR = ROOT / 'deployments/PW-WOORI-05/site/out'
EVIDENCE = ROOT / 'evidence/SPRITE-MOTION'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sync(evidence_root=EVIDENCE):
    files = sorted(path for path in APP.rglob('*') if path.is_file() and path.name != '.DS_Store')
    paths = {path.relative_to(APP) for path in files}
    existing = {path.relative_to(MIRROR) for path in MIRROR.rglob('*') if path.is_file()}
    # Unexpected mirror files need review. Do not delete another user's work.
    assert not existing - paths, f'Unexpected mirror files: {existing - paths}'
    assert all('sprite-source' not in path.parts for path in paths)
    assert not any(path.suffix in ('.gif', '.mp4', '.webm') for path in paths)
    assets = json.loads((EVIDENCE / 'assets.json').read_text())
    assert assets['complete'] and assets['sheets'] == 11
    records = []
    for source in files:
        relative = source.relative_to(APP)
        target = MIRROR / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists() or digest(source) != digest(target):
            shutil.copy2(source, target)
        assert digest(source) == digest(target), f'Mirror differs: {relative}'
        records.append({'path': relative.as_posix(), 'bytes': source.stat().st_size, 'sha256': digest(source)})
    result = {
        'scope': 'Local mirror only; no public deployment',
        'source': str(APP.relative_to(ROOT)), 'mirror': str(MIRROR.relative_to(ROOT)),
        'verified': True, 'files': records, 'fileCount': len(records),
        'spriteSheetCount': assets['sheets'], 'spriteSheetBytes': assets['totalBytes'],
        'sourceFramesExcluded': True,
        'historicalReleaseMetadataUnchanged': ['deployment.json', 'source-manifest.json', 'site.tar.gz'],
    }
    evidence_root.mkdir(parents=True, exist_ok=True)
    (evidence_root / 'mirror-manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'files': len(records), 'mirrorVerified': True, 'sheets': assets['sheets']}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence-root", type=Path, default=EVIDENCE, help="Write the new mirror manifest without replacing prior evidence")
    sync(parser.parse_args().evidence_root)
