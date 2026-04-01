import logging
import feedparser
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

RSS_URL = "https://www.bleepingcomputer.com/feed/"

# This panel name is what will be stored in dashboard.panel_feed.panel_name.
PANEL_NAME = "security_news_rss"

# The URL/source string that identifies where the data came from.
SOURCE_FEED_URL = RSS_URL

def fetch_items(max_results=5):
    logger.info(f"Fetching RSS feed from {RSS_URL}")

    parsed = feedparser.parse(RSS_URL)

    entries = list(getattr(parsed, "entries", []) or [])
    # Prefer newest first using feedparser's parsed time when available.
    # Fall back to original ordering if dates are missing.
    if any(getattr(e, "published_parsed", None) for e in entries):
        entries.sort(
            key=lambda e: getattr(e, "published_parsed", None) or (0,),
            reverse=True,
        )

    items = []
    for entry in entries[:max_results]:
        item = {
            "title": getattr(entry, "title", ""),
            "url": getattr(entry, "link", ""),
            "published": getattr(entry, "published", ""),
            "summary": getattr(entry, "summary", "")
        }
        items.append(item)

    logger.info(f"Fetched {len(items)} RSS items (latest {max_results})")
    return items


def build_payload(items):
    """
    Builds the JSON payload to store in dashboard.panel_feed.payload.
    Other panel modules can provide their own build_payload(items) for custom shapes.
    """
    return {
        "items": items,
        "items_count": len(items),
        "fetched_at": datetime.utcnow().isoformat()
    }


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    items = fetch_items()
    payload = build_payload(items)
    print(f"OK: fetched {len(items)} items")

if __name__ == "__main__":
    main()