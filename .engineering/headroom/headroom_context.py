#!/usr/bin/env python3
"""Optional offline context optimization. Originals are private, verified and durable.

Invoke with a reviewed Python environment containing headroom-ai==0.45.0.
The parent uses only the standard library; the sibling worker imports the SDK
after establishing its Linux no-IP boundary. No provider, proxy or agent setup.
"""
import argparse
import contextlib
import datetime
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import platform
import re
import selectors
import stat
import subprocess
import sys
import tempfile
import time

try:
    import fcntl
except ImportError:
    fcntl = None

VERSION = '0.45.0'
MAX_BYTES = 2 * 1024 * 1024
SHORT_BYTES = 1024
CONTEXT_CHARS = 4096
KINDS = ('tool-json', 'log', 'code', 'policy')
SHA = re.compile(r'[a-f0-9]{64}')
SECRET_NAMES = {'.git', '.ssh', '.aws', '.codex', '.claude', 'credentials', 'credentials.json',
                'auth.json', 'secrets.json', 'id_rsa', 'id_ed25519', 'shadow'}
SECRET_FIELDS = {'apikey', 'accesstoken', 'password', 'passwd', 'clientsecret', 'privatekey',
                 'authorization', 'authtoken', 'token', 'secret', 'databaseurl'}


def strict_json(data):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('Duplicate JSON field')
            result[key] = value
        return result
    def number(value):
        result = float(value)
        if not math.isfinite(result):
            raise ValueError('Nonfinite JSON number')
        return result
    return json.loads(data, object_pairs_hook=pairs, parse_float=number,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError('Nonfinite JSON number')))


def _digest(data):
    return hashlib.sha256(data).hexdigest()


def _path(value):
    raw = os.fspath(value)
    if not raw or '\x00' in raw or '..' in Path(raw).parts:
        raise ValueError('Unsafe path')
    result = Path(os.path.abspath(raw))
    for part in [result, *result.parents]:
        if part.is_symlink():
            raise ValueError('Symlink path refused')
    return result


def _private_directory(value, create=False):
    path = _path(value)
    if not Path(os.fspath(value)).is_absolute():
        raise ValueError('Absolute private store required')
    for parent in [path, *path.parents]:
        marker = parent / '.git'
        if marker.is_symlink() or marker.is_file():
            raise ValueError('Private store must be outside Git')
        if marker.exists():
            # Managed sandboxes may expose an empty, read-only .git stub at a
            # filesystem root. It is not a Git repository. Writable markers
            # and all actual/nonempty Git metadata remain disallowed.
            if not marker.is_dir() or marker.stat().st_mode & 0o222 or next(marker.iterdir(), None) is not None:
                raise ValueError('Private store must be outside Git')
    if create:
        # Concurrent first callers may both initialize before the store lock.
        # EEXIST is safe only after repeating all path/Git/ownership checks;
        # never follow a symlink substituted during mkdir(exist_ok=True).
        path.mkdir(mode=0o700, parents=False, exist_ok=True)
        return _private_directory(path)
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise ValueError('Owner-only private directory required')
    return path


def _read_file(path, private=False, limit=MAX_BYTES):
    path = _path(path)
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(descriptor, 'rb') as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > limit:
            raise ValueError('Bounded regular file required')
        if private and (info.st_uid != os.getuid() or info.st_mode & 0o077):
            raise ValueError('Owner-only private file required')
        data = stream.read(limit + 1)
        if len(data) > limit:
            raise ValueError('Input exceeds bound')
        return data


def _fsync_directory(path):
    descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def _new_file(path, data):
    """Publish complete immutable bytes without replacing an existing name."""
    if path.exists() or path.is_symlink():
        if _read_file(path, private=True) != data:
            raise ValueError('Immutable entry conflict')
        return
    descriptor, name = tempfile.mkstemp(prefix='.pending-', dir=path.parent)
    temporary = Path(name)
    try:
        with os.fdopen(descriptor, 'wb') as stream:
            os.fchmod(stream.fileno(), 0o600)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.link(temporary, path, follow_symlinks=False)
        temporary.unlink()
        _fsync_directory(path.parent)
    finally:
        if temporary.exists():
            temporary.unlink()


@contextlib.contextmanager
def _locked(store, create=False):
    if fcntl is None:
        raise ValueError('Private locking unavailable')
    root = _private_directory(store, create)
    descriptor = os.open(root / '.lock', os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        info = os.fstat(descriptor)
        if info.st_uid != os.getuid() or info.st_mode & 0o077 or info.st_nlink != 1 or not stat.S_ISREG(info.st_mode):
            raise ValueError('Unsafe lock')
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        yield root
    finally:
        os.close(descriptor)


def _entry(root, identity, create=False):
    if not isinstance(identity, str) or not SHA.fullmatch(identity):
        raise ValueError('Exact original SHA256 required')
    entries = _private_directory(root / 'entries', create)
    return _private_directory(entries / identity, create)


def _load_original(entry, identity):
    manifest = strict_json(_read_file(entry / 'manifest.json', private=True, limit=65536))
    original = _read_file(entry / 'original.utf8', private=True)
    if manifest['schema_version'] != 1 or manifest['id'] != identity or manifest['original_sha256'] != identity:
        raise ValueError('Manifest identity mismatch')
    if len(original) != manifest['input_bytes'] or _digest(original) != identity:
        raise ValueError('Original hash mismatch')
    return manifest, original.decode('utf-8')


def _inspect_input(path, kind):
    path = _path(path)
    if any(part.lower() in SECRET_NAMES or part.lower().startswith('.env') for part in path.parts):
        raise ValueError('Credential paths refused')
    if path.suffix.lower() in {'.pem', '.key', '.p12', '.pfx'} or path.parts[1:2] in [('proc',), ('sys',), ('dev',), ('etc',)]:
        raise ValueError('Sensitive or special path refused')
    raw = _read_file(path)
    text = raw.decode('utf-8')
    reason = 'protected-kind' if kind in ('code', 'policy') else None
    facts = set(re.findall(r'\b(?:[a-fA-F0-9]{64}|[a-fA-F0-9]{40})\b', text))
    if path.name in ('AGENTS.md', 'CLAUDE.md', 'SECURITY.md'):
        reason = 'protected-instructions'
    if kind == 'tool-json':
        payload = strict_json(text)
        nodes = 0
        def inspect(value, depth=0, key=''):
            nonlocal nodes, reason
            nodes += 1
            if depth > 40 or nodes > 100000:
                raise ValueError('JSON complexity bound exceeded')
            if isinstance(value, dict):
                if value.get('role') in ('system', 'user', 'developer'):
                    reason = 'protected-message-role'
                for name, item in value.items():
                    if re.sub(r'[-_]', '', name.casefold()) in SECRET_FIELDS and item:
                        raise ValueError('Credential fields refused')
                    inspect(item, depth + 1, name.lower())
            elif isinstance(value, list):
                for item in value:
                    inspect(item, depth + 1, key)
            elif isinstance(value, str) and (key in ('id', 'sha', 'sha1', 'sha256', 'commit', 'revision', 'path', 'source', 'url', 'error') or key.endswith('_id')):
                if value:
                    facts.add(value)
            elif type(value) in (int, float) and key in ('tests', 'passed', 'failed', 'skipped', 'errors', 'failures', 'test_count'):
                facts.add(str(value))
        inspect(payload)
    else:
        for line in text.splitlines():
            if re.search(r'\b(?:error|fail(?:ed|ure)?|traceback|assertionerror|tests?|passed|skipped)\b', line, re.I):
                if line.strip():
                    facts.add(line.strip())
        facts.update(re.findall(r'(?:[A-Za-z]:\\|/|\.?\.?/)[^\s\"\'<>]+', text))
    if re.search(r'(?im)^\s*(?:system|user|developer|owner[_ -]?policy|code[_ -]?contract)\s*:', text):
        reason = 'protected-instructions'
    if not reason and len(raw) < SHORT_BYTES:
        reason = 'short-input'
    return raw, text, reason, facts


def _worker_environment(directory):
    """No inherited provider keys, config overrides, proxy settings or HOME changes."""
    folders = {name: _private_directory(directory / name, True) for name in ('config', 'state', 'cache', 'tokenizer')}
    return {'PATH': '/usr/bin:/bin', 'LANG': 'C.UTF-8', 'LC_ALL': 'C.UTF-8',
            'HEADROOM_OFFLINE': '1', 'HEADROOM_BEACON': 'off', 'HEADROOM_TELEMETRY': 'off', 'DO_NOT_TRACK': '1',
            'HEADROOM_CCR_BACKEND': 'memory', 'HEADROOM_STATELESS': '1',
            'HEADROOM_CONFIG_DIR': str(folders['config']), 'HEADROOM_WORKSPACE_DIR': str(folders['state']),
            'TIKTOKEN_CACHE_DIR': str(folders['tokenizer']), 'XDG_CACHE_HOME': str(folders['cache']),
            'HF_HOME': str(folders['cache']), 'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1',
            'ORT_DISABLE_TELEMETRY': '1', 'CREWAI_DISABLE_TELEMETRY': 'true',
            'LITELLM_LOCAL_MODEL_COST_MAP': 'True', 'HEADROOM_TIKTOKEN_LOAD_TIMEOUT_SECONDS': '0.25',
            'OMP_NUM_THREADS': '1', 'OPENBLAS_NUM_THREADS': '1', 'TMPDIR': str(directory)}


def _run_worker(text, directory):
    if platform.system() != 'Linux':
        return {'ok': False, 'reason': 'linux-isolation-unavailable'}
    worker = Path(__file__).with_name('headroom_worker.py').resolve(strict=True)
    environment = _worker_environment(directory)
    request = json.dumps({'content': text}, ensure_ascii=False).encode('utf-8')
    started = time.monotonic()
    with subprocess.Popen([sys.executable, '-I', str(worker)], cwd=directory, env=environment,
                          stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                          close_fds=True, start_new_session=True) as process:
        selector = selectors.DefaultSelector()
        try:
            # The worker consumes bounded stdin before any optional SDK import.
            process.stdin.write(request)
            process.stdin.close()
            selector.register(process.stdout, selectors.EVENT_READ)
            output = bytearray()
            while True:
                remaining = 30 - (time.monotonic() - started)
                if remaining <= 0 or not selector.select(remaining):
                    raise ValueError('Worker timeout')
                block = os.read(process.stdout.fileno(), min(65536, MAX_BYTES * 2 + 1 - len(output)))
                if not block:
                    break
                output.extend(block)
                if len(output) > MAX_BYTES * 2:
                    raise ValueError('Worker output bound exceeded')
            if process.wait(timeout=max(.01, 30 - (time.monotonic() - started))):
                raise ValueError('Worker failed')
            result = strict_json(output)
            if not isinstance(result, dict):
                raise ValueError('Worker response rejected')
            return result
        except (OSError, ValueError, subprocess.SubprocessError):
            return {'ok': False, 'reason': 'isolated-runtime-failed'}
        finally:
            selector.close()
            if process.poll() is None:
                os.killpg(process.pid, 9)
                process.wait(timeout=5)


def _choose_result(original, response, facts):
    if not isinstance(response, dict) or response.get('ok') is not True:
        return original, 'fallback', 'isolated-runtime-unavailable'
    if response.get('sdk_version') != VERSION or response.get('network_boundary') != 'linux-seccomp-no-ip':
        return original, 'fallback', 'unreviewed-runtime'
    if response.get('lossless') is not True or response.get('ccr_roundtrip') is not True or response.get('protected_messages_unchanged') is not True:
        return original, 'fallback', 'preservation-not-proved'
    before, after = response.get('tokens_before'), response.get('tokens_after')
    if type(before) is not int or type(after) is not int or not 0 < after < before:
        return original, 'fallback', 'zero-or-nonreducing-counters'
    latency = response.get('compression_latency_ms')
    if type(latency) not in (int, float) or not math.isfinite(latency) or not 0 <= latency <= 30000:
        return original, 'fallback', 'invalid-runtime-measurement'
    content = response.get('content')
    if not isinstance(content, str) or not content or len(content.encode('utf-8')) >= len(original.encode('utf-8')):
        return original, 'fallback', 'nonreducing-output'
    # Do not treat a different longer identifier or count as preservation.
    def contains(fact):
        left = r'(?<![A-Za-z0-9_.-])' if fact[:1].isalnum() else ''
        right = r'(?![A-Za-z0-9_.-])' if fact[-1:].isalnum() else ''
        return re.search(left + re.escape(fact) + right, content) is not None
    if any(not contains(fact) for fact in facts):
        return original, 'fallback', 'critical-fact-missing'
    return content, 'optimized', 'lossless-sdk-and-ccr-verified'


def optimize(input_path, store, kind):
    if kind not in KINDS:
        raise ValueError('Unknown content kind')
    raw, original, skip, facts = _inspect_input(input_path, kind)
    identity = _digest(raw)
    with _locked(store, True) as root:
        entry = _entry(root, identity, True)
        if (entry / 'manifest.json').exists():
            manifest, prior = _load_original(entry, identity)
            if prior != original or manifest['kind'] != kind:
                raise ValueError('Immutable entry conflict')
        else:
            _new_file(entry / 'original.utf8', raw)
            manifest = {'schema_version': 1, 'id': identity, 'kind': kind, 'original_sha256': identity,
                        'input_bytes': len(raw), 'saved_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        'storage': 'durable private original; not a replicated backup or an SDK cache'}
            _new_file(entry / 'manifest.json', json.dumps(manifest, sort_keys=True).encode())
        if (entry / 'result.json').exists():
            result = strict_json(_read_file(entry / 'result.json', private=True, limit=65536))
            output = _read_file(entry / 'optimized.utf8', private=True)
            if result['id'] != identity or result['original_sha256'] != identity or result['output_sha256'] != _digest(output):
                raise ValueError('Stored result hash mismatch')
            return {**result, 'content': output.decode('utf-8'), 'reused_immutable_result': True}
        response = {}
        if skip:
            content, state, reason = original, 'passthrough', skip
        else:
            jobs = _private_directory(root / 'jobs', True)
            try:
                with tempfile.TemporaryDirectory(prefix='sdk-', dir=jobs) as temporary:
                    response = _run_worker(original, Path(temporary))
            except (OSError, ValueError, subprocess.SubprocessError):
                response = {'ok': False}
            content, state, reason = _choose_result(original, response, facts)
            if not isinstance(response, dict):
                response = {}
        output = content.encode('utf-8')
        accepted = state == 'optimized'
        result = {'schema_version': 1, 'id': identity, 'kind': kind, 'status': state, 'reason': reason,
                  'original_sha256': identity, 'output_sha256': _digest(output), 'input_bytes': len(raw),
                  'output_bytes': len(output), 'byte_reduction': len(raw) - len(output),
                  'sdk_version': VERSION if response.get('sdk_version') == VERSION else None,
                  'lossless': response.get('lossless') if accepted else None,
                  'ccr_roundtrip': response.get('ccr_roundtrip') if accepted else False,
                  'protected_messages_unchanged': response.get('protected_messages_unchanged') if accepted else None,
                  'network_boundary': 'linux-seccomp-no-ip' if response.get('network_boundary') == 'linux-seccomp-no-ip' else None,
                  'exact_tokens': {'before': None, 'after': None},
                  'estimated_tokens': {'before': response.get('tokens_before') if accepted else None,
                                       'after': response.get('tokens_after') if accepted else None,
                                       'source': 'SDK reported counts; exact BPE not independently verified' if accepted else None},
                  'compression_latency_ms': response.get('compression_latency_ms') if accepted else None,
                  'context_usage': None, 'billing': None, 'native_agent_interception': False,
                  'original_retrieval': 'durable SHA256 source; SDK CCR roundtrip is transient, not a backup'}
        _new_file(entry / 'optimized.utf8', output)
        _new_file(entry / 'result.json', json.dumps(result, sort_keys=True).encode())
        return {**result, 'content': content, 'reused_immutable_result': False}


def retrieve(store, identity, query=None, full=False):
    if query is not None and (full or not isinstance(query, str) or not 0 < len(query) <= 128 or any(ord(c) < 32 for c in query)):
        raise ValueError('Bounded literal query required')
    with _locked(store) as root:
        manifest, original = _load_original(_entry(root, identity), identity)
    selected = original
    found = None
    if query is not None:
        found = query.casefold() in original.casefold()
        lines = original.splitlines()
        indexes = [i for i, line in enumerate(lines) if query.casefold() in line.casefold()][:5]
        selected = '\n'.join(lines[j] for j in sorted({j for i in indexes for j in range(max(0, i - 2), min(len(lines), i + 3))}))
    if not full:
        selected = selected[:CONTEXT_CHARS]
    return {'schema_version': 1, 'id': identity, 'original_sha256': identity, 'source_hash_verified': True,
            'input_bytes': manifest['input_bytes'], 'content': selected, 'complete': selected == original,
            'query_found': found, 'full_requested': full, 'context_usage': None, 'billing': None,
            'retrieval_backend': 'durable original; no SDK cache or package required'}


def status(store=None):
    try:
        installed = importlib.metadata.version('headroom-ai')
    except importlib.metadata.PackageNotFoundError:
        installed = None
    result = {'schema_version': 1, 'required_sdk_version': VERSION, 'installed_sdk_version': installed,
              'sdk_imported': False, 'linux_isolation_required': True, 'platform_supported': platform.system() == 'Linux',
              'optimization_candidate': installed == VERSION and platform.system() == 'Linux',
              'runtime_verified': False, 'context_usage': None, 'billing': None, 'native_agent_interception': False}
    if store is not None:
        with _locked(store) as root:
            entries = _private_directory(root / 'entries') if (root / 'entries').exists() else None
            result['stored_originals'] = len(list(entries.iterdir())) if entries else 0
            result['store_hash_verification'] = 'Individual full-source hashes are verified by retrieve, not inferred from this count'
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    command = commands.add_parser('optimize')
    command.add_argument('--input', required=True, type=Path)
    command.add_argument('--store', required=True, type=Path)
    command.add_argument('--kind', required=True, choices=KINDS)
    command = commands.add_parser('retrieve')
    command.add_argument('--store', required=True, type=Path)
    command.add_argument('--id', required=True)
    selection = command.add_mutually_exclusive_group()
    selection.add_argument('--query')
    selection.add_argument('--full', action='store_true')
    command = commands.add_parser('status')
    command.add_argument('--store', type=Path)
    args = parser.parse_args(argv)
    try:
        if args.command == 'optimize':
            result = optimize(args.input, args.store, args.kind)
        elif args.command == 'retrieve':
            result = retrieve(args.store, args.id, args.query, args.full)
        else:
            result = status(args.store)
    except (OSError, ValueError, KeyError, TypeError, UnicodeError, RecursionError):
        print(json.dumps({'schema_version': 1, 'status': 'rejected', 'error': 'Input or private-store verification failed.'}))
        return 1
    print(json.dumps(result, ensure_ascii=False, allow_nan=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
