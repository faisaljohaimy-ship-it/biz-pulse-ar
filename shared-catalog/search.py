"""Search the shared catalog locally. Requires Python 3."""
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

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query")
    parser.add_argument("--type", choices=["model", "skill", "mcp_server", "software"])
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()
    if args.limit < 1 or not args.query.strip():
        parser.error("Provide a search term and a positive limit.")
    archive = Path(__file__).resolve().with_name("global.zip")
    rows = matching_rows(archive, args.query.strip().casefold(), args.type)
    for row in itertools.islice(rows, args.limit):
        print(json.dumps(row, ensure_ascii=False))

if __name__ == "__main__":
    main()
