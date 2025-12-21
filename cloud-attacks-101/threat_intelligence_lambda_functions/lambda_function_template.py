import json
import os
import psycopg2
from psycopg2.extras import Json
from datetime import datetime, timedelta
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
RDS_ENDPOINT = os.environ.get("RDS_ENDPOINT")
RDS_DB_NAME = os.environ.get("RDS_DB_NAME")
RDS_USERNAME = os.environ.get("RDS_USERNAME")
RDS_PASSWORD = os.environ.get("RDS_PASSWORD")
PANEL_NAME = os.environ.get("PANEL_NAME", "security_news_rss")
SOURCE_FEED = os.environ.get("SOURCE_FEED", "rss_feed")
MAX_RESULTS = int(os.environ.get("MAX_RESULTS", "100"))

print("psycopg2 OK:", psycopg2.__version__)

def lambda_handler(event, context):
    """
    Daily execution: Fetch threat intelligence feed, store in dashboard.panel_feed,
    and clean up data older than 14 days
    """
    try:
        logger.info(f"Starting {PANEL_NAME} feed processing (max_results: {MAX_RESULTS})")
        
        # 1. Fetch feed data (limit to MAX_RESULTS)
        raw_data = fetch_feed_data(MAX_RESULTS)
        logger.info(f"Fetched {len(raw_data)} items from {PANEL_NAME}")
        
        if not raw_data:
            logger.warning(f"No data fetched for {PANEL_NAME}")
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "panel_name": PANEL_NAME,
                    "items_stored": 0,
                    "status": "success",
                    "message": "No new data available"
                })
            }
        
        # 2. Transform to standard format for payload
        payload_data = {
            "items": raw_data,
            "items_count": len(raw_data),
            "fetched_at": datetime.utcnow().isoformat()
        }
        
        # 3. Store in RDS
        store_to_rds(payload_data)
        
        # 4. Clean up data older than 14 days
        cleanup_old_data()
        
        logger.info(f"Successfully processed {PANEL_NAME}: {len(raw_data)} items stored")
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "panel_name": PANEL_NAME,
                "items_stored": len(raw_data),
                "status": "success",
                "timestamp": datetime.utcnow().isoformat()
            })
        }
        
    except Exception as e:
        logger.error(f"Error processing {PANEL_NAME}: {str(e)}", exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({
                "panel_name": PANEL_NAME,
                "error": str(e),
                "status": "failed",
                "timestamp": datetime.utcnow().isoformat()
            })
        }

def fetch_feed_data(limit):
    """
    Fetch data from external source - implement per feed type
    Returns: List of feed items (max limit)
    
    TODO: Implement feed-specific fetching logic
    Examples:
    - RSS feed: Use feedparser
    - API: Use requests
    - File: Use boto3 for S3
    """
    # Placeholder - replace with actual implementation
    return []

def get_db_connection():
    """Create RDS PostgreSQL connection with retry logic"""
    import time
    max_retries = 3
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(
                host=RDS_ENDPOINT,
                database=RDS_DB_NAME,
                user=RDS_USERNAME,
                password=RDS_PASSWORD,
                connect_timeout=10,
                sslmode='require'
            )
            return conn
        except psycopg2.OperationalError as e:
            if attempt < max_retries - 1:
                logger.warning(f"Connection attempt {attempt + 1} failed, retrying...")
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                raise e

def store_to_rds(payload_data):
    """Store feed data in dashboard.panel_feed table"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert new record into dashboard.panel_feed
        insert_query = """
            INSERT INTO dashboard.panel_feed 
            (panel_name, source_feed, payload, collected_at)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """
        
        cursor.execute(
            insert_query,
            (
                PANEL_NAME,
                SOURCE_FEED,
                Json(payload_data),
                datetime.utcnow()
            )
        )
        
        record_id = cursor.fetchone()[0]
        conn.commit()
        
        logger.info(f"Stored feed data with ID: {record_id}")
        
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {str(e)}")
        raise e
    finally:
        if conn:
            cursor.close()
            conn.close()

def cleanup_old_data():
    """Delete feed data older than 14 days from dashboard.panel_feed"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Delete records older than 14 days
        cutoff_date = datetime.utcnow() - timedelta(days=14)
        
        delete_query = """
            DELETE FROM dashboard.panel_feed
            WHERE collected_at < %s
        """
        
        cursor.execute(delete_query, (cutoff_date,))
        deleted_count = cursor.rowcount
        conn.commit()
        
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} records older than 14 days")
        else:
            logger.info("No old records to clean up")
        
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        logger.error(f"Cleanup error: {str(e)}")
        # Don't raise - cleanup failure shouldn't fail the main process
    finally:
        if conn:
            cursor.close()
            conn.close()
