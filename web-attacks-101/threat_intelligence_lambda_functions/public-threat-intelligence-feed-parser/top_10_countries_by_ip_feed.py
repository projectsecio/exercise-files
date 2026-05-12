import csv
import io
import logging
import os
from collections import Counter
from datetime import datetime
from ipaddress import ip_address
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

try:
    import geoip2.database
except Exception:  # pragma: no cover
    geoip2 = None

PANEL_NAME = "top_10_countries_by_ip"
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


def fetch_items(max_results: int = 10):
    csv_url = os.environ.get("THREATFOX_RECENT_CSV_URL", SOURCE_FEED_URL).strip()
    timeout_s = int(os.environ.get("THREATFOX_HTTP_TIMEOUT_S", "20"))
    source_limit = int(os.environ.get("TOP_COUNTRIES_SOURCE_LIMIT", "5000"))
    # GeoLite2-Country.mmdb → use reader.country(). GeoLite2-City.mmdb also supports .country().
    geolite2_path = os.environ.get("GEOLITE2_DB_PATH", "/opt/GeoLite2-Country.mmdb").strip()

    if geoip2 is None:
        logger.warning("geoip2 module is unavailable; install geoip2 + maxminddb in Lambda package/layer")
        return []
    if not os.path.exists(geolite2_path):
        logger.warning("GeoLite2 DB not found at %s", geolite2_path)
        try:
            opt_list = sorted(os.listdir("/opt")) if os.path.isdir("/opt") else []
            logger.warning(
                "Layer check: /opt exists=%s entries (first 40)=%s",
                os.path.isdir("/opt"),
                opt_list[:40],
            )
        except OSError as e:
            logger.warning("Could not list /opt: %s", e)
        logger.warning(
            "Attach a layer whose zip contains opt/GeoLite2-Country.mmdb (→ /opt/GeoLite2-Country.mmdb) "
            "or set GEOLITE2_DB_PATH to the real path."
        )
        return []

    logger.info("Fetching top countries by IP from %s", csv_url)
    rows = _fetch_recent_csv(csv_url=csv_url, timeout_s=timeout_s)
    if source_limit > 0:
        rows = rows[:source_limit]

    country_counts: Counter = Counter()
    country_meta: dict[str, dict] = {}

    with geoip2.database.Reader(geolite2_path) as reader:
        for row in rows:
            ip = _extract_ip_from_ioc(row.get("ioc_type", ""), row.get("ioc_value", ""))
            if not ip:
                continue
            try:
                geo = reader.country(ip)
            except Exception:
                continue

            country_code = (geo.country.iso_code or "").upper()
            country_name = (geo.country.name or "").strip()
            if not country_code:
                continue

            country_counts[country_code] += 1
            if country_code not in country_meta:
                country_meta[country_code] = {
                    "country_name": country_name or country_code,
                    "sample_ip": ip,
                }

    ranked = sorted(country_counts.items(), key=lambda x: (-x[1], x[0]))
    items = []
    for idx, (country_code, hit_count) in enumerate(ranked[:max_results], start=1):
        meta = country_meta.get(country_code, {})
        country_name = meta.get("country_name", country_code)
        sample_ip = meta.get("sample_ip", "")
        items.append(
            {
                "rank": idx,
                "country_code": country_code,
                "country_name": country_name,
                "count": hit_count,
                "sample_ip": sample_ip,
                "title": f"{idx}. {country_name} ({country_code}) - {hit_count}",
                "url": f"https://threatfox.abuse.ch/browse.php?search=ioc%3A{quote(sample_ip)}" if sample_ip else "",
            }
        )

    logger.info(
        "Built top countries panel with %s items from %s source rows",
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

