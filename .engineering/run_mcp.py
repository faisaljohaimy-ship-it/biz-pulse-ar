"""Read-only engineering MCP launcher; local integrity is not upstream approval."""
import hashlib
import json
import os
import pathlib
import re
import sys


def no_duplicates(items):
    result = {}
    for key, value in items:
        if key in result:
            raise ValueError("Duplicate manifest key")
        result[key] = value
    return result


def main():
    if len(sys.argv) != 1:
        raise ValueError("This launcher takes no arguments")
    root = pathlib.Path(__file__).resolve().parents[1]
    manifest_path = root / ".engineering/capabilities.json"
    if manifest_path.is_symlink() or manifest_path.stat().st_size > 1024 * 1024:
        raise ValueError("Unsafe capability manifest")
    manifest = json.loads(manifest_path.read_text(), object_pairs_hook=no_duplicates)
    if not isinstance(manifest, dict):
        raise ValueError("Manifest must be an object")
    if manifest.get("schema_version") != 1 or not re.fullmatch(r"[a-f0-9]{40}", str(manifest.get("hub_revision", ""))):
        raise ValueError("Invalid capability manifest")
    if manifest.get("production_runtime_dependency") is not False or type(manifest.get("budget_additional_sar")) is not int or manifest["budget_additional_sar"] != 0:
        raise ValueError("Unexpected runtime dependency or budget")
    sdk = root / ".engineering/sdk/engineering_sdk.py"
    verified_sdk = False
    capabilities = manifest.get("capabilities")
    if not isinstance(capabilities, list) or not capabilities:
        raise ValueError("No registered capabilities")
    for capability in capabilities:
        if not isinstance(capability, dict):
            raise ValueError("Capability must be an object")
        files = capability.get("files")
        if not isinstance(files, list) or not files:
            raise ValueError("No registered files")
        for row in files:
            if not isinstance(row, dict) or not isinstance(row.get("path"), str):
                raise ValueError("Managed file must have a path")
            relative = row["path"]
            parts = pathlib.PurePosixPath(relative).parts
            if not parts or relative.startswith("/") or ".." in parts or parts[0] == ".git":
                raise ValueError("Unsafe managed path")
            path = root
            for part in parts:
                path = path / part
                if path.is_symlink():
                    raise ValueError("Managed symlink refused")
            expected = row["sha256"]
            if not re.fullmatch(r"[a-f0-9]{64}", str(expected)) or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                raise ValueError("Managed file integrity mismatch")
            if path == sdk and row.get("source") == "sdk/engineering_sdk.py":
                verified_sdk = True
    if not verified_sdk:
        raise ValueError("Engineering server is not a managed capability")
    os.chdir(root)
    os.execv(sys.executable, [sys.executable, str(sdk), "mcp", "--project", str(root)])


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError):
        print("Engineering MCP startup failed local integrity verification", file=sys.stderr)
        sys.exit(1)
