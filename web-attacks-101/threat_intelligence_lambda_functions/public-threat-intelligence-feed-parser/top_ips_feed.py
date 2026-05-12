import csv
import io
import logging
import os
from collections import Counter
from datetime import datetime
from ipaddress import ip_address
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

PANEL_NAME = "top_ips"
SOURCE_FEED_URL = "https://threatfox.abuse.ch/export/csv/recent/"

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def _normalize_ip(value: str) -> str:
    v = (value or "").strip().strip("[]")
    if not v:
        return ""
    try:
        return str(ip_address(v))
    except Exception:
        return ""


def _extract_ip_from_ioc(ioc_type: str, ioc_value: str) -> str:
    ioc_type = (ioc_type or "").strip().lower()
    value = (ioc_value or "").strip()
    if not value:
        return ""

    if ioc_type == "ip":
        return _normalize_ip(value)

    if ioc_type == "ip:port":
        host = value.rsplit(":", 1)[0]
        return _normalize_ip(host)

    if ioc_type == "url":
        try:
            host = urlparse(value).hostname or ""
        except Exception:
            host = ""
        return _normalize_ip(host)

    return ""


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
    source_limit = int(os.environ.get("TOP_IPS_SOURCE_LIMIT", "5000"))

    logger.info("Fetching top IPs from %s", csv_url)
    rows = _fetch_recent_csv(csv_url=csv_url, timeout_s=timeout_s)
    if source_limit > 0:
        rows = rows[:source_limit]

    ip_counts: Counter = Counter()
    ip_meta: dict[str, dict] = {}

    for row in rows:
        ioc_type = row.get("ioc_type", "")
        ioc_value = row.get("ioc_value", "")
        ip = _extract_ip_from_ioc(ioc_type, ioc_value)
        if not ip:
            continue

        ip_counts[ip] += 1
        if ip not in ip_meta:
            ip_meta[ip] = {
                "first_seen_utc": row.get("first_seen_utc", ""),
                "threat_type": row.get("threat_type", ""),
                "malware": row.get("malware_printable", "") or row.get("fk_malware", ""),
                "confidence_level": row.get("confidence_level", ""),
            }

    ranked_ips = sorted(ip_counts.items(), key=lambda x: (-x[1], x[0]))
    items = []
    for idx, (ip, hit_count) in enumerate(ranked_ips[:max_results], start=1):
        meta = ip_meta.get(ip, {})
        items.append(
            {
                "rank": idx,
                "ip": ip,
                "count": hit_count,
                "title": f"{idx}. {ip} ({hit_count})",
                "url": f"https://threatfox.abuse.ch/browse.php?search=ioc%3A{quote(ip)}",
                "first_seen_utc": meta.get("first_seen_utc", ""),
                "threat_type": meta.get("threat_type", ""),
                "malware": meta.get("malware", ""),
                "confidence_level": meta.get("confidence_level", ""),
            }
        )

    logger.info(
        "Built top IP panel with %s items from %s source rows",
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

