import json
import logging
from datetime import datetime

# from rss_feed import fetch_feed as fetch_rss_feed
# from abuseipdb_feed import fetch_feed as fetch_abuseipdb_feed
from db import store_panel_feed

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
        feed_result = fetch_rss_feed(max_results=5)

        if not isinstance(feed_result, dict):
            raise TypeError("Feed must return a dictionary")

        required_keys = ["panel_name", "source_feed", "items"]
        for key in required_keys:
            if key not in feed_result:
                raise KeyError(f"Feed result missing required key: {key}")

        if not isinstance(feed_result["items"], list):
            raise TypeError("'items' must be a list")

        payload = {
            "items": feed_result["items"],
            "items_count": len(feed_result["items"]),
            "fetched_at": datetime.utcnow().isoformat()
        }

        record_id = store_panel_feed(
            panel_name=feed_result["panel_name"],
            source_feed=feed_result["source_feed"],
            payload_data=payload
        )

        return {
            "statusCode": 200,
            "body": json.dumps({
                "status": "success",
                "record_id": record_id,
                "panel_name": feed_result["panel_name"],
                "source_feed": feed_result["source_feed"],
                "items_stored": len(feed_result["items"])
            })
        }

    except Exception as e:
        logger.exception("Lambda failed")
        return {
            "statusCode": 500,
            "body": json.dumps({
                "status": "failed",
                "error": str(e)
            })
        }