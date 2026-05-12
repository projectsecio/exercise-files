import csv
import io
import json
import logging
import os
from collections import Counter
from datetime import datetime
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

PANEL_NAME = "top_100_domains"
SOURCE_FEED_URL = "https://threatfox.abuse.ch/export/csv/recent/"

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def _is_domain(value: str) -> bool:
    # ThreatFox "domain" IoCs are plain hostnames.
    if not value or " " in value or "/" in value or ":" in value:
        return False
    return "." in value


def _extract_domain_from_ioc(ioc_type: str, ioc_value: str) -> str:
    ioc_type = (ioc_type or "").strip().lower()
    value = (ioc_value or "").strip().lower().rstrip(".")
    if not value:
        return ""

    if ioc_type in {"domain", "hostname", "fqdn"}:
        return value if _is_domain(value) else ""

    if ioc_type == "url":
        try:
            host = (urlparse(value).hostname or "").strip().lower().rstrip(".")
        except Exception:
            host = ""
        return host if _is_domain(host) else ""

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

    # ThreatFox CSV wraps the header as a commented line, then data lines follow.
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


def _fetch_recent_iocs_from_api(timeout_s: int = 20, api_limit: int = 1000) -> list[dict]:
    auth_key = (os.environ.get("ABUSECH_AUTH_KEY") or "").strip()
    if not auth_key:
        logger.warning("ABUSECH_AUTH_KEY is not set; skipping ThreatFox API fallback")
        return []

    req = Request(
        "https://threatfox-api.abuse.ch/api/v1/",
        method="POST",
        data=json.dumps(
            {
                "query": "get_iocs",
                "limit": int(api_limit),
            }
        ).encode("utf-8"),
        headers={
            "User-Agent": "projectx-threat-intel/1.0",
            "Content-Type": "application/json",
            "Auth-Key": auth_key,
        },
    )
    with urlopen(req, timeout=timeout_s) as resp:
        raw = json.loads(resp.read().decode("utf-8", errors="replace"))

    data = raw.get("data", [])
    if not isinstance(data, list):
        return []
    return data


def fetch_items(max_results: int = 100):
    csv_url = os.environ.get("THREATFOX_RECENT_CSV_URL", SOURCE_FEED_URL).strip()
    timeout_s = int(os.environ.get("THREATFOX_HTTP_TIMEOUT_S", "20"))
    source_limit = int(os.environ.get("TOP_100_DOMAINS_SOURCE_LIMIT", "5000"))

    logger.info("Fetching top domains from %s", csv_url)
    rows = _fetch_recent_csv(csv_url=csv_url, timeout_s=timeout_s)
    source_name = "threatfox_csv_recent"

    if not rows:
        api_limit = int(os.environ.get("THREATFOX_API_LIMIT", "2000"))
        logger.info("ThreatFox CSV returned no rows; attempting API fallback")
        rows = _fetch_recent_iocs_from_api(timeout_s=timeout_s, api_limit=api_limit)
        source_name = "threatfox_api_get_iocs"

    if source_limit > 0:
        rows = rows[:source_limit]

    domain_counts: Counter = Counter()
    domain_meta: dict[str, dict] = {}

    for row in rows:
        ioc_type = row.get("ioc_type", "")
        ioc = row.get("ioc_value", "")
        domain = _extract_domain_from_ioc(ioc_type, ioc)
        if not domain:
            continue

        domain_counts[domain] += 1
        if domain not in domain_meta:
            domain_meta[domain] = {
                "first_seen_utc": row.get("first_seen_utc", ""),
                "threat_type": row.get("threat_type", ""),
                "malware": row.get("malware_printable", "") or row.get("fk_malware", ""),
                "confidence_level": row.get("confidence_level", ""),
            }

    ranked_domains = sorted(domain_counts.items(), key=lambda x: (-x[1], x[0]))

    items = []
    for idx, (domain, hit_count) in enumerate(ranked_domains[:max_results], start=1):
        meta = domain_meta.get(domain, {})
        items.append(
            {
                "rank": idx,
                "domain": domain,
                "count": hit_count,
                "title": f"{idx}. {domain} ({hit_count})",
                "url": f"https://threatfox.abuse.ch/browse.php?search=ioc%3A{quote(domain)}",
                "first_seen_utc": meta.get("first_seen_utc", ""),
                "threat_type": meta.get("threat_type", ""),
                "malware": meta.get("malware", ""),
                "confidence_level": meta.get("confidence_level", ""),
            }
        )

    logger.info(
        "Built top domain panel with %s items from %s source rows (%s)",
        len(items),
        len(rows),
        source_name,
    )
    return items


def build_payload(items):
    return {
        "items": items,
        "items_count": len(items),
        "fetched_at": datetime.utcnow().isoformat(),
    }

