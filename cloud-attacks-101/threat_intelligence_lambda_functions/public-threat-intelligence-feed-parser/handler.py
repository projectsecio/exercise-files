import json
import logging
import os
import importlib
from datetime import datetime, timezone
from typing import Any, Optional

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

_s3_client = None


def _get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client("s3")
    return _s3_client


DEFAULT_PANEL_KEY = "security_news_rss"

# Map panel keys (what event/env selects) to the corresponding module file (without .py).
PANEL_MODULES = {
    "security_news_rss": "rss_feed",
    "top_100_domains": "top_100_domains_feed",
    "top_ips": "top_ips_feed",
    "top_10_countries_by_ip": "top_10_countries_by_ip_feed",
    "top_malware_hashes": "top_malware_hashes_feed",
    "top_iocs": "top_iocs_feed",
}


def build_s3_key(feed_type: str, when: Optional[datetime] = None) -> str:
    """
    Standard object key: {date}/{feed_type}.json
    date = UTC calendar day YYYY-MM-DD (for partitioning and listing).
    """
    prefix = (os.environ.get("S3_KEY_PREFIX") or "").strip().strip("/")
    dt = when or datetime.now(timezone.utc)
    date_part = dt.strftime("%Y-%m-%d")
    key = f"{date_part}/{feed_type}.json"
    if prefix:
        return f"{prefix}/{key}"
    return key


def put_feed_to_s3(
    bucket: str,
    key: str,
    document: dict[str, Any],
) -> None:
    body = json.dumps(document, ensure_ascii=False, default=str)
    _get_s3_client().put_object(
        Bucket=bucket,
        Key=key,
        Body=body.encode("utf-8"),
        ContentType="application/json",
    )
    logger.info("Wrote feed snapshot to s3://%s/%s", bucket, key)


def _default_build_payload(items: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "items": items,
        "items_count": len(items),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def _resolve_panel_key(panel_selection: Optional[str]) -> str:
    if not panel_selection:
        return DEFAULT_PANEL_KEY

    if panel_selection in PANEL_MODULES:
        return panel_selection

    for panel_key, module_name in PANEL_MODULES.items():
        try:
            module = importlib.import_module(module_name)
        except Exception:
            continue
        if getattr(module, "PANEL_NAME", None) == panel_selection:
            return panel_key

    raise ValueError(
        f"Unknown panel selection '{panel_selection}'. "
        f"Set event['panel_key'] to one of: {sorted(PANEL_MODULES.keys())}"
    )


def _load_panel_module(panel_key: str):
    module_name = PANEL_MODULES[panel_key]
    return importlib.import_module(module_name)


def run_panel(panel_selection: Optional[str], max_results: int = 5) -> dict[str, Any]:
    bucket = os.environ.get("FEED_OUTPUT_BUCKET") or os.environ.get("S3_BUCKET")
    if not bucket:
        raise ValueError(
            "Set FEED_OUTPUT_BUCKET (or S3_BUCKET) to the target S3 bucket name."
        )

    panel_key = _resolve_panel_key(panel_selection)
    module = _load_panel_module(panel_key)

    panel_name = getattr(module, "PANEL_NAME", panel_key)
    source_feed = getattr(module, "SOURCE_FEED_URL", "")

    fetch_fn = getattr(module, "fetch_items", None) or getattr(module, "fetch_rss_feed", None)
    if not callable(fetch_fn):
        raise AttributeError(
            f"Panel module '{module.__name__}' must export fetch_items(max_results) (or fetch_rss_feed)."
        )

    items = fetch_fn(max_results=max_results)

    build_payload_fn = getattr(module, "build_payload", None)
    if callable(build_payload_fn):
        payload_data = build_payload_fn(items)
    else:
        payload_data = _default_build_payload(items)

    now = datetime.now(timezone.utc)
    s3_key = build_s3_key(feed_type=panel_key, when=now)

    # Document shape for Lambda 2 (DB writer): panel_name, source_feed, payload mirror DB columns.
    document = {
        "schema_version": 1,
        "feed_type": panel_key,
        "panel_name": panel_name,
        "source_feed": source_feed,
        "payload": payload_data,
        "written_at": now.isoformat(),
    }

    put_feed_to_s3(bucket, s3_key, document)

    return {
        "s3_bucket": bucket,
        "s3_key": s3_key,
        "panel_name": panel_name,
        "source_feed": source_feed,
        "items_stored": len(items),
    }


def lambda_handler(event, context):
    try:
        panel_selection = None
        max_results = 5

        if isinstance(event, dict):
            panel_selection = (
                event.get("panel_key")
                or event.get("panel_type")
                or event.get("panel_name")
            )
            if event.get("max_results") is not None:
                max_results = int(event["max_results"])

        result = run_panel(panel_selection, max_results=max_results)

        return {
            "statusCode": 200,
            "body": json.dumps({
                "status": "success",
                "s3_bucket": result["s3_bucket"],
                "s3_key": result["s3_key"],
                "panel_name": result["panel_name"],
                "source_feed": result["source_feed"],
                "items_stored": result["items_stored"],
            }),
        }

    except Exception as e:
        logger.exception("Lambda failed")
        return {
            "statusCode": 500,
            "body": json.dumps({
                "status": "failed",
                "error": str(e),
            }),
        }


def main(max_results: int = 5):
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    panel_selection = os.environ.get("PANEL_KEY") or os.environ.get("PANEL_NAME") or DEFAULT_PANEL_KEY
    result = run_panel(panel_selection, max_results=max_results)
    print(
        f"OK: wrote {result['items_stored']} items to "
        f"s3://{result['s3_bucket']}/{result['s3_key']}"
    )
    return result


if __name__ == "__main__":
    main()
