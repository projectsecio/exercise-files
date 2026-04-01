#!/usr/bin/env python3
"""
Local test: load a Lambda-1-style JSON file (same body as S3) and insert via db.store_panel_feed.

Usage (from this directory):
  export EC2_ENDPOINT=... EC2_DB_NAME=... EC2_USERNAME=... EC2_PASSWORD=... EC2_PORT=5432 EC2_SSLMODE=require
  python3 local_ingest.py
  python3 local_ingest.py path/to/other.json

Requires: network path from your machine to Postgres (SG must allow your IP, or use SSH tunnel / VPN).
"""
import argparse
import json
import sys
from pathlib import Path

from handler import ingest_feed_document


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest a feed JSON file into dashboard.panel_feed")
    parser.add_argument(
        "json_file",
        nargs="?",
        default="security_news_rss.json",
        help="Path to JSON file (default: security_news_rss.json in cwd)",
    )
    args = parser.parse_args()
    path = Path(args.json_file)
    if not path.is_file():
        print(f"File not found: {path}", file=sys.stderr)
        return 1
    doc = json.loads(path.read_text(encoding="utf-8"))
    record_id = ingest_feed_document(doc)
    print(f"OK: inserted dashboard.panel_feed id={record_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
