import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SDK = ROOT / '.engineering/sdk/engineering_sdk.py'


class OfflineIntegration(unittest.TestCase):
    def test_selected_catalog_does_not_claim_webgpu_is_installed(self):
        result = subprocess.run(['python3', str(SDK), 'discover', '--query', 'webgpu'],
                                cwd=ROOT, capture_output=True, text=True, check=True)
        rows = json.loads(result.stdout)
        self.assertTrue(rows)
        self.assertTrue(any(row.get('status') == 'candidate' for row in rows))

    def test_stdio_verification_and_unauthorized_deploy(self):
        requests = [
            {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/list'},
            {'jsonrpc': '2.0', 'id': 2, 'method': 'tools/call',
             'params': {'name': 'engineering_verify', 'arguments': {}}},
            {'jsonrpc': '2.0', 'id': 3, 'method': 'tools/call',
             'params': {'name': 'deploy', 'arguments': {}}},
        ]
        result = subprocess.run(['python3', str(SDK), 'mcp', '--project', str(ROOT)],
                                input=''.join(json.dumps(row) + '\n' for row in requests),
                                capture_output=True, text=True, check=True)
        rows = [json.loads(line) for line in result.stdout.splitlines()]
        self.assertEqual(len(rows), 3)
        self.assertEqual({t['name'] for t in rows[0]['result']['tools']},
                         {'engineering_discover', 'engineering_verify'})
        self.assertFalse(rows[1]['result']['isError'])
        self.assertTrue(rows[2]['result']['isError'])
        self.assertEqual(result.stderr, '')

    def test_corrupted_copy_fails_without_touching_real_project(self):
        manifest = json.loads((ROOT / '.engineering/capabilities.json').read_text())
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)
            (target / '.engineering').mkdir()
            (target / '.engineering/capabilities.json').write_text(json.dumps(manifest))
            for capability in manifest['capabilities']:
                for row in capability['files']:
                    destination = target / row['path']
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(ROOT / row['path'], destination)
            clean = subprocess.run(['python3', str(SDK), 'verify', '--project', folder],
                                   capture_output=True, text=True)
            self.assertEqual(clean.returncode, 0)
            (target / '.engineering/sdk/VERSION').write_text('unreviewed\n')
            changed = subprocess.run(['python3', str(SDK), 'verify', '--project', folder],
                                     capture_output=True, text=True)
            self.assertNotEqual(changed.returncode, 0)
