import csv
import io
import logging
import os
from collections import Counter
from datetime import datetime
from urllib.parse import quote
from urllib.request import Request, urlopen

PANEL_NAME = "top_iocs"
SOURCE_FEED_URL = "https://threatfox.abuse.ch/export/csv/recent/"

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def _normalize_ioc(ioc_type: str, ioc_value: str) -> str:
    ioc_type = (ioc_type or "").strip().lower()
    value = (ioc_value or "").strip()
    if not value:
        return ""

    # Keep casing stable/lower for matching while preserving data utility.
    if ioc_type in {"domain", "hostname", "fqdn", "url", "ip", "ip:port"}:
        return value.lower()
    if ioc_type in {"md5_hash", "sha1_hash", "sha256_hash"}:
        return value.lower()
    return value


def _fetch_recent_csv(csv_url: str, timeout_s: int = 20) -> list[dict]:
    req = Request(
        csv_url,
        headers={
            "User-Agent": "projectx-threat-intel/1.0",
            "Accept": "text/csv,*/*",
        },
    )
    with urlopen(req, timeout=timeout_s) as resp:
        text = resp.read().decode("utf-8", errors="replace")

    header_line = ""
    data_lines = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("#"):
            candidate = line.lstrip("#").strip()
            if "ioc_value" in candidate and "ioc_type" in candidate:
                header_line = candidate
            continue
        data_lines.append(line)

    if not header_line or not data_lines:
        return []

    csv_text = "\n".join([header_line] + data_lines)
    return list(csv.DictReader(io.StringIO(csv_text), skipinitialspace=True))


def fetch_items(max_results: int = 100):
    csv_url = os.environ.get("THREATFOX_RECENT_CSV_URL", SOURCE_FEED_URL).strip()
    timeout_s = int(os.environ.get("THREATFOX_HTTP_TIMEOUT_S", "20"))
    source_limit = int(os.environ.get("TOP_IOCS_SOURCE_LIMIT", "5000"))
    allowed_types_env = os.environ.get(
        "TOP_IOCS_ALLOWED_TYPES",
        "domain,hostname,fqdn,url,ip,ip:port,md5_hash,sha1_hash,sha256_hash",
    )
    allowed_types = {x.strip().lower() for x in allowed_types_env.split(",") if x.strip()}

    logger.info("Fetching top IOCs from %s", csv_url)
    rows = _fetch_recent_csv(csv_url=csv_url, timeout_s=timeout_s)
    if source_limit > 0:
        rows = rows[:source_limit]

    ioc_counts: Counter = Counter()
    ioc_meta: dict[tuple[str, str], dict] = {}

    for row in rows:
        ioc_type = (row.get("ioc_type", "") or "").strip().lower()
        if ioc_type not in allowed_types:
            continue

        raw_ioc = row.get("ioc_value", "")
        ioc_value = _normalize_ioc(ioc_type, raw_ioc)
        if not ioc_value:
            continue

        key = (ioc_type, ioc_value)
        ioc_counts[key] += 1
        if key not in ioc_meta:
            ioc_meta[key] = {
                "first_seen_utc": row.get("first_seen_utc", ""),
                "threat_type": row.get("threat_type", ""),
                "malware": row.get("malware_printable", "") or row.get("fk_malware", ""),
                "confidence_level": row.get("confidence_level", ""),
                "reference": row.get("reference", ""),
            }

    ranked = sorted(ioc_counts.items(), key=lambda x: (-x[1], x[0][0], x[0][1]))
    items = []
    for idx, ((ioc_type, ioc_value), hit_count) in enumerate(ranked[:max_results], start=1):
        meta = ioc_meta.get((ioc_type, ioc_value), {})
        display_ioc = f"{ioc_value[:48]}..." if len(ioc_value) > 51 else ioc_value
        items.append(
            {
                "rank": idx,
                "ioc_type": ioc_type,
                "ioc_value": ioc_value,
                "count": hit_count,
                "title": f"{idx}. [{ioc_type}] {display_ioc} ({hit_count})",
                "url": f"https://threatfox.abuse.ch/browse.php?search=ioc%3A{quote(ioc_value)}",
                "first_seen_utc": meta.get("first_seen_utc", ""),
                "threat_type": meta.get("threat_type", ""),
                "malware": meta.get("malware", ""),
                "confidence_level": meta.get("confidence_level", ""),
                "reference": meta.get("reference", ""),
            }
        )

    logger.info(
        "Built top IOCs panel with %s items from %s source rows",
        len(items),
        len(rows),
    )
    return items


def build_payload(items):
    return {
        "items": items,
        "items_count": len(items),
        "fetched_at": datetime.utcnow().isoformat(),
    }

