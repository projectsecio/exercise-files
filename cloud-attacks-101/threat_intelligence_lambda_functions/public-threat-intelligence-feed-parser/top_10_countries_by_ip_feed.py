from datetime import datetime

PANEL_NAME = "top_10_countries_by_ip"
SOURCE_FEED_URL = "placeholder"


def fetch_items(max_results: int = 10):
    # Placeholder for CA101: WA101 will implement the real feed.
    return []


def build_payload(items):
    return {
        "items": items,
        "items_count": len(items),
        "fetched_at": datetime.utcnow().isoformat(),
    }

