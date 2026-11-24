"""Search the shared catalog locally. Requires Python 3."""
import hashlib
import os
import tempfile
import urllib.request
import argparse
import csv
import io
import itertools
import json
from pathlib import Path
import zipfile

def matching_rows(archive, query, kind):
    with zipfile.ZipFile(archive) as catalog:
        for name in sorted(catalog.namelist()):
            if not name.startswith("global/"):
                continue
            with catalog.open(name) as raw, io.TextIOWrapper(raw, encoding="utf-8-sig") as stream:
                for row in csv.DictReader(stream):
                    if kind and row["type"] != kind:
                        continue
                    if query in (row["source_id"] + " " + row["task_or_description"]).casefold():
                        yield row

CATALOG_SHA256 = "16252e2a1a7e8262ae1d7efd5f081d5b005ed31b4dcd3055adb5d4f1a7aecf9a"
CATALOG_URL = "https://raw.githubusercontent.com/faisaljohaimy-ship-it/biz-pulse-ar/063ac71978755fc98f6011e2cad2a8c5de59bec1/shared-catalog/global.zip"

def catalog_path():
    cache = Path(os.getenv("XDG_CACHE_HOME") or Path.home() / ".cache") / "shared-ai-catalog"
    cache.mkdir(parents=True, exist_ok=True)
    target = cache / (CATALOG_SHA256 + ".zip")
    if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == CATALOG_SHA256:
        return target
    with urllib.request.urlopen(CATALOG_URL, timeout=45) as response:
        data = response.read(3390957)
    if hashlib.sha256(data).hexdigest() != CATALOG_SHA256:
        raise ValueError("Downloaded catalog checksum mismatch")
    with tempfile.NamedTemporaryFile(dir=cache, delete=False) as temp:
        temp.write(data)
    os.replace(temp.name, target)
    return target

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query")
    parser.add_argument("--type", choices=["model", "skill", "mcp_server", "software"])
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()
    if args.limit < 1 or not args.query.strip():
        parser.error("Provide a search term and a positive limit.")
    archive = catalog_path()
    rows = matching_rows(archive, args.query.strip().casefold(), args.type)
    for row in itertools.islice(rows, args.limit):
        print(json.dumps(row, ensure_ascii=False))

if __name__ == "__main__":
    main()
