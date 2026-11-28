"""Offline engineering SDK. Standard library only; never deploys or runs catalog code.

Vendored by `hub.py register --capability pack:engineering-sdk`. Run with --help.
MCP transport: newline-delimited JSON-RPC on stdio; all exposed tools are read-only.
"""

import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import sys

VERSION = "1.0.0"
HERE = pathlib.Path(__file__).resolve().parent
SHA = re.compile(r"[a-f0-9]{40}")
REPOSITORY = re.compile(r"https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")


def pairs(items):
    result = {}
    for key, value in items:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def read_json(path):
    return json.loads(path.read_text(), object_pairs_hook=pairs,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError("invalid number")))


def safe_path(root, name):
    path = pathlib.PurePosixPath(name)
    if not name or path.is_absolute() or ".." in path.parts or path.parts[0] == ".git":
        raise ValueError("unsafe path")
    current = root
    for part in path.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("symlink refused")
    return current


def verify(root):
    """Verify the committed local file checksums; upstream authenticity is hub.py's job."""
    manifest = read_json(safe_path(root, ".engineering/capabilities.json"))
    if manifest.get("schema_version") != 1 or not SHA.fullmatch(str(manifest.get("hub_revision", ""))):
        raise ValueError("invalid capability manifest or pin")
    if manifest.get("production_runtime_dependency") is not False or type(manifest.get("budget_additional_sar")) is not int or manifest["budget_additional_sar"] != 0:
        raise ValueError("runtime dependency or additional budget refused")
    capabilities = manifest.get("capabilities")
    if not isinstance(capabilities, list) or not capabilities:
        raise ValueError("no installed capability")
    seen, count = {}, 0
    for capability in capabilities:
        if not isinstance(capability, dict) or not capability.get("id") or not capability.get("files"):
            raise ValueError("invalid capability")
        for row in capability["files"]:
            name, expected = row["path"], row["sha256"]
            if not re.fullmatch(r"[a-f0-9]{64}", str(expected)):
                raise ValueError("invalid checksum")
            if name in seen and seen[name] != expected:
                raise ValueError("conflicting capability files")
            seen[name] = expected
            data = safe_path(root, name).read_bytes()
            if hashlib.sha256(data).hexdigest() != expected:
                raise ValueError(f"capability checksum mismatch: {name}")
            count += 1
    return {"status": "local-integrity-verified", "files": count,
            "upstream_authenticity": "verify separately with hub.py verify --strict",
            "sdk_version": VERSION, "network_requests": 0}


def target(root, repository, team, project, commit):
    """Bind a release command to a repository-local target; fail closed on uncertainty."""
    contract = read_json(safe_path(root, ".engineering/project.json"))
    if contract.get("schema_version") != 1 or contract.get("identity_verified") is not True:
        raise ValueError("project identity is not verified")
    if not REPOSITORY.fullmatch(repository) or not SHA.fullmatch(commit):
        raise ValueError("invalid repository or commit")
    if contract.get("repository") != repository:
        raise ValueError("repository mismatch")
    if contract.get("vercel") != {"team_id": team, "project_id": project, "root_directory": "."}:
        raise ValueError("team, project or root mismatch")
    head = subprocess.run(["git", "-C", str(root), "rev-parse", "HEAD"],
                          capture_output=True, text=True, check=True).stdout.strip()
    if head != commit:
        raise ValueError("tested commit is not checkout HEAD")
    if subprocess.run(["git", "-C", str(root), "status", "--porcelain", "--untracked-files=normal"],
                      capture_output=True, check=True).stdout:
        raise ValueError("release checkout has uncommitted files")
    return contract


def release(root, evidence, repository, team, project, commit):
    contract = target(root, repository, team, project, commit)
    if evidence.get("schema_version") != 1 or evidence.get("commit") != commit:
        raise ValueError("stale or invalid release evidence")
    if evidence.get("repository") != repository or evidence.get("vercel") != contract["vercel"]:
        raise ValueError("release evidence belongs to another project")
    required = contract.get("required_checks")
    if not isinstance(required, list) or not required or len(required) != len(set(required)):
        raise ValueError("missing or duplicate mandatory checks")
    checks = evidence.get("checks", {})
    for name in required:
        if checks.get(name) != {"commit": commit, "conclusion": "success"}:
            raise ValueError(f"mandatory check not successful at release SHA: {name}")
    if evidence.get("review") != {"commit": commit, "decision": "approved"}:
        raise ValueError("exact-commit review missing")
    rollback = evidence.get("rollback", {})
    if rollback.get("project_id") != project or not str(rollback.get("deployment_id", "")).startswith("dpl_") or rollback.get("verified") is not True:
        raise ValueError("verified rollback artifact missing")
    stage = evidence.get("stage", {})
    if stage.get("project_id") != project or stage.get("commit") != commit or stage.get("target") != "production" or stage.get("smoke") != "success" or stage.get("domains_assigned") is not False or not str(stage.get("deployment_id", "")).startswith("dpl_"):
        raise ValueError("verified staged production artifact missing")
    if evidence.get("configuration_preserved") is not True or evidence.get("additional_cost") != 0 or type(evidence.get("additional_cost")) is not int:
        raise ValueError("configuration preservation or zero additional cost unproven")
    return {"status": "eligible-for-promotion", "deployment_id": stage["deployment_id"],
            "commit": commit, "note": "Validate receipts against provider APIs before promotion; this command does not deploy."}


def registry(path):
    data = read_json(path)
    if data.get("schema_version") != 1 or not isinstance(data.get("projects"), list):
        raise ValueError("invalid private project registry")
    repositories, projects = set(), set()
    for row in data["projects"]:
        repo, vercel = row.get("repository", ""), row.get("vercel", {})
        if not REPOSITORY.fullmatch(repo) or row.get("visibility") != "private":
            raise ValueError("commercial projects must use private GitHub repositories")
        identity = (vercel.get("team_id"), vercel.get("project_id"))
        if not all(identity) or vercel.get("root_directory") != ".":
            raise ValueError("missing deployment identity")
        if repo in repositories or identity in projects:
            raise ValueError("repository or deployment target is shared")
        repositories.add(repo)
        projects.add(identity)
    return {"status": "unique-targets", "projects": len(projects)}


def catalog(query=""):
    data = read_json(HERE / "capabilities.json")
    rows = list(data["capabilities"])
    registry_path = HERE / "tool-registry.json"
    if not registry_path.exists():
        registry_path = HERE.parent / "catalog/registry.json"
    rows.extend(read_json(registry_path))
    programs_path = HERE / "integrations.json"
    if not programs_path.exists():
        programs_path = HERE.parent / "integrations/PROGRAMS.json"
    rows.extend({"id": "provider:" + row["name"], "status": "environment-specific",
                 "upstream": row["url"], "automatic_invocation": False}
                for row in read_json(programs_path)["programs"])
    return [row for row in rows if query.casefold() in json.dumps(row).casefold()]


TOOLS = [
    {"name": "engineering_discover", "description": "Search local reviewed and candidate capabilities. Does not install or execute tools.",
     "inputSchema": {"type": "object", "properties": {"query": {"type": "string"}}, "additionalProperties": False},
     "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False}},
    {"name": "engineering_verify", "description": "Verify local vendored capability checksums, without network access.",
     "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
     "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False}},
]


def rpc(message, root):
    if message.get("jsonrpc") != "2.0" or not isinstance(message.get("method"), str):
        return {"jsonrpc": "2.0", "id": message.get("id"), "error": {"code": -32600, "message": "Invalid request"}}
    if "id" not in message:
        return None
    result = None
    method = message["method"]
    if method == "initialize":
        offered = message.get("params", {}).get("protocolVersion")
        protocol = offered if offered in ("2024-11-05", "2025-03-26", "2025-06-18") else "2025-06-18"
        result = {"protocolVersion": protocol, "serverInfo": {"name": "engineering-sdk", "version": VERSION}, "capabilities": {"tools": {"listChanged": False}}}
    elif method == "ping":
        result = {}
    elif method == "tools/list":
        result = {"tools": TOOLS}
    elif method == "tools/call":
        params = message.get("params", {})
        name, args = params.get("name"), params.get("arguments", {})
        try:
            if not isinstance(args, dict):
                raise ValueError("arguments must be an object")
            if name == "engineering_discover" and set(args) <= {"query"} and isinstance(args.get("query", ""), str):
                value = catalog(args.get("query", ""))
            elif name == "engineering_verify" and not args:
                value = verify(root)
            else:
                raise ValueError("unknown tool or invalid arguments")
            result = {"content": [{"type": "text", "text": json.dumps(value)}], "isError": False}
        except (ValueError, OSError, KeyError, TypeError):
            result = {"content": [{"type": "text", "text": "Local verification or request failed. Inspect the project manifest."}], "isError": True}
    else:
        return {"jsonrpc": "2.0", "id": message["id"], "error": {"code": -32601, "message": "Method not found"}}
    return {"jsonrpc": "2.0", "id": message["id"], "result": result}


def mcp(root):
    for line in sys.stdin:
        try:
            if len(line) > 1024 * 1024:
                raise ValueError("message too large")
            message = json.loads(line, object_pairs_hook=pairs)
            if not isinstance(message, dict):
                raise ValueError("request must be an object")
            response = rpc(message, root)
        except (ValueError, TypeError, AttributeError):
            response = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Invalid JSON-RPC message"}}
        if response is not None:
            print(json.dumps(response), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["discover", "verify", "target", "release", "registry", "mcp"])
    parser.add_argument("--project", type=pathlib.Path, default=pathlib.Path.cwd())
    parser.add_argument("--query", default="")
    parser.add_argument("--evidence", type=pathlib.Path)
    parser.add_argument("--registry", type=pathlib.Path)
    parser.add_argument("--repository")
    parser.add_argument("--team")
    parser.add_argument("--vercel-project")
    parser.add_argument("--commit")
    args = parser.parse_args()
    root = args.project.resolve()
    try:
        if args.command == "mcp":
            mcp(root)
            return 0
        if args.command == "discover":
            result = catalog(args.query)
        elif args.command == "verify":
            result = verify(root)
        elif args.command == "registry":
            result = registry(args.registry)
        elif args.command == "target":
            target(root, args.repository, args.team, args.vercel_project, args.commit)
            result = {"status": "target-matches-checkout"}
        else:
            result = release(root, read_json(args.evidence), args.repository, args.team, args.vercel_project, args.commit)
        print(json.dumps(result, indent=2))
        return 0
    except (OSError, ValueError, TypeError, KeyError, AttributeError, subprocess.CalledProcessError) as error:
        print(f"Engineering check failed: {type(error).__name__}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
