#!/usr/bin/env python3
"""Verify the local mirror and every preserved historic/source file."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(evidence_root):
    preservation = json.loads((ROOT / 'evidence/SINGLE-SCREEN/preservation.json').read_text())
    for relative, expected in preservation['preserved'].items():
        assert digest(ROOT / relative) == expected, f'Preserved file changed: {relative}'
    manifest = json.loads((evidence_root / 'mirror-manifest.json').read_text())
    source, mirror = ROOT / manifest['source'], ROOT / manifest['mirror']
    expected_paths = {item['path'] for item in manifest['files']}
    for directory in (source, mirror):
        actual = {p.relative_to(directory).as_posix() for p in directory.rglob('*') if p.is_file() and p.name != '.DS_Store'}
        assert actual == expected_paths, f'File set mismatch: {directory}'
        for item in manifest['files']:
            assert digest(directory / item['path']) == item['sha256'], f'Content mismatch: {directory / item["path"]}'
    result = {
        'status': 'PASS',
        'historicalAndSourceFilesPreserved': len(preservation['preserved']),
        'sourceAndMirrorFilesMatched': len(expected_paths),
        'publicDeploymentPerformed': False,
    }
    (evidence_root / 'delivery-integrity.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence-root', type=Path, default=ROOT / 'evidence/SINGLE-SCREEN/delivery')
    verify(parser.parse_args().evidence_root)
