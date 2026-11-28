#!/usr/bin/env python3
"""Private subprocess protocol for the reviewed offline Headroom SDK, not a service."""
import contextlib
import ctypes
import errno
import hashlib
import importlib.metadata
import io
import json
import os
from pathlib import Path
import platform
import resource
import socket
import sys
import time

MAX_BYTES = 2 * 1024 * 1024
VERSION = '0.45.0'


def deny_ip():
    """Reviewed libseccomp boundary; no SDK import or inherited IP descriptors."""
    if platform.system() != 'Linux' or platform.machine() not in ('x86_64', 'aarch64'):
        raise ValueError('Unsupported kernel boundary')
    class ArgCmp(ctypes.Structure):
        _fields_ = [('arg', ctypes.c_uint), ('op', ctypes.c_uint),
                    ('datum_a', ctypes.c_uint64), ('datum_b', ctypes.c_uint64)]
    lib = ctypes.CDLL('libseccomp.so.2', use_errno=True)
    lib.seccomp_init.argtypes = [ctypes.c_uint32]
    lib.seccomp_init.restype = ctypes.c_void_p
    lib.seccomp_syscall_resolve_name.argtypes = [ctypes.c_char_p]
    lib.seccomp_syscall_resolve_name.restype = ctypes.c_int
    lib.seccomp_rule_add_array.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int,
                                          ctypes.c_uint, ctypes.POINTER(ArgCmp)]
    lib.seccomp_rule_add_array.restype = ctypes.c_int
    lib.seccomp_load.argtypes = [ctypes.c_void_p]
    lib.seccomp_load.restype = ctypes.c_int
    lib.seccomp_release.argtypes = [ctypes.c_void_p]
    ctx = lib.seccomp_init(0x7fff0000)
    if not ctx:
        raise ValueError('Kernel filter initialization failed')
    try:
        for name in ('socket', 'socketpair', 'io_uring_setup', 'io_uring_enter', 'io_uring_register'):
            number = lib.seccomp_syscall_resolve_name(name.encode())
            if number < 0:
                if name in ('socket', 'socketpair'):
                    raise ValueError('Required syscall unavailable')
                continue
            comparisons = [ArgCmp(0, 1, socket.AF_UNIX, 0)] if name in ('socket', 'socketpair') else []
            array = (ArgCmp * len(comparisons))(*comparisons) if comparisons else None
            if lib.seccomp_rule_add_array(ctx, 0x00050000 | errno.EPERM, number, len(comparisons), array):
                raise ValueError('Kernel filter rule failed')
        libc = ctypes.CDLL(None, use_errno=True)
        if libc.prctl(38, 1, 0, 0, 0):
            raise ValueError('No-new-privileges failed')
        os.closerange(3, os.sysconf('SC_OPEN_MAX'))
        if lib.seccomp_load(ctx):
            raise ValueError('Kernel filter load failed')
    finally:
        lib.seccomp_release(ctx)
    for family in (socket.AF_INET, socket.AF_INET6):
        for operation in (socket.socket, socket.socketpair):
            try:
                opened = operation(family, socket.SOCK_STREAM)
            except OSError as error:
                if error.errno != errno.EPERM:
                    raise ValueError('Unexpected network boundary') from None
            else:
                for connection in opened if isinstance(opened, tuple) else (opened,):
                    connection.close()
                raise ValueError('IP boundary not established')


def execute(request):
    required = {'HEADROOM_OFFLINE': '1', 'HEADROOM_BEACON': 'off', 'HEADROOM_TELEMETRY': 'off',
                'DO_NOT_TRACK': '1', 'HEADROOM_CCR_BACKEND': 'memory', 'HEADROOM_STATELESS': '1',
                'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1', 'ORT_DISABLE_TELEMETRY': '1'}
    if any(os.environ.get(key) != value for key, value in required.items()):
        raise ValueError('Explicit offline configuration required before SDK import')
    for name in ('HEADROOM_CONFIG_DIR', 'HEADROOM_WORKSPACE_DIR', 'TIKTOKEN_CACHE_DIR', 'XDG_CACHE_HOME'):
        path = Path(os.environ[name])
        if not path.is_absolute() or path.is_symlink() or not path.is_relative_to(Path.cwd()) or path.stat().st_mode & 0o077:
            raise ValueError('Private runtime paths required')
    deny_ip()
    resource.setrlimit(resource.RLIMIT_CPU, (20, 20))
    resource.setrlimit(resource.RLIMIT_FSIZE, (4 * MAX_BYTES, 4 * MAX_BYTES))
    resource.setrlimit(resource.RLIMIT_AS, (2 * 1024 ** 3, 2 * 1024 ** 3))
    if request.get('operation') == 'probe':
        return {'ok': True, 'network_boundary': 'linux-seccomp-no-ip'}
    if importlib.metadata.version('headroom-ai') != VERSION:
        raise ValueError('Only the reviewed SDK version is allowed')
    original = request['content']
    if not isinstance(original, str) or len(original.encode('utf-8')) > MAX_BYTES:
        raise ValueError('Bounded text required')
    started = time.perf_counter()
    # Suppress SDK diagnostics from the machine-readable protocol, never log payloads.
    with contextlib.redirect_stdout(io.StringIO()):
        from headroom import densify
        from headroom.cache.compression_store import CompressionStore
        messages = [{'role': 'system', 'content': 'Preserve all governing instructions and exact source identifiers.'},
                    {'role': 'user', 'content': 'Process only this selected non-sensitive tool output locally.'},
                    {'role': 'tool', 'tool_call_id': 'selected-context', 'content': original}]
        result = densify(messages, model='gpt-4o', model_limit=200000,
                         compress_system_messages=False, compress_user_messages=False,
                         kompress_model='disabled', min_tokens_to_compress=250)
        unchanged = len(result.messages) == 3 and result.messages[:2] == messages[:2]
        unchanged = unchanged and result.messages[2].get('role') == 'tool' and result.messages[2].get('tool_call_id') == 'selected-context'
        optimized = result.messages[2]['content'] if unchanged else original
        if not isinstance(optimized, str):
            raise ValueError('Unexpected SDK content')
        store = CompressionStore(max_entries=16, default_ttl=60)
        identity = hashlib.sha256(original.encode()).hexdigest()
        key = store.store(original, optimized, original_tokens=result.tokens_before,
                          compressed_tokens=result.tokens_after, explicit_hash=identity, ttl=60)
        entry = store.retrieve(key)
        exact = key == identity and entry is not None and entry.original_content == original
    return {'ok': True, 'content': optimized, 'sdk_version': VERSION, 'lossless': result.lossless,
            'ccr_roundtrip': exact, 'protected_messages_unchanged': unchanged,
            'tokens_before': result.tokens_before, 'tokens_after': result.tokens_after,
            'network_boundary': 'linux-seccomp-no-ip',
            'compression_latency_ms': (time.perf_counter() - started) * 1000}


def main():
    try:
        raw = sys.stdin.buffer.read(MAX_BYTES * 2 + 1)
        if len(raw) > MAX_BYTES * 2:
            raise ValueError('Request too large')
        request = json.loads(raw)
        result = execute(request)
    except Exception:
        result = {'ok': False, 'reason': 'isolated-runtime-unavailable'}
    print(json.dumps(result, ensure_ascii=False, allow_nan=False))


if __name__ == '__main__':
    main()
