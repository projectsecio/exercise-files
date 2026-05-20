import logging
import os
import time
from datetime import datetime, timedelta

import psycopg2
from psycopg2.extras import Json

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def _connection_params():
    """Neon / Fly.io (WA101): NEON_DATABASE_URL or DB_*; CA101 EC2 lab: EC2_*."""
    url = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if url:
        return {"dsn": url}

    host = os.environ.get("DB_HOST") or os.environ.get("EC2_ENDPOINT")
    return {
        "host": host,
        "dbname": os.environ.get("DB_NAME") or os.environ.get("EC2_DB_NAME", "projectxdb"),
        "user": os.environ.get("DB_USER") or os.environ.get("EC2_USERNAME", "webapp_rw"),
        "password": os.environ.get("DB_PASSWORD") or os.environ.get("EC2_PASSWORD"),
        "port": int(os.environ.get("DB_PORT") or os.environ.get("EC2_PORT", "5432")),
        "sslmode": os.environ.get("DB_SSLMODE") or os.environ.get("EC2_SSLMODE", "require"),
    }


def get_db_connection():
    max_retries = 3
    params = _connection_params()

    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(connect_timeout=10, **params)
            if "dsn" in params:
                logger.info("Connection to PostgreSQL was successful (dsn=NEON_DATABASE_URL)")
            else:
                logger.info(
                    "Connection to PostgreSQL was successful (host=%s db=%s user=%s port=%s sslmode=%s)",
                    params.get("host"),
                    params.get("dbname"),
                    params.get("user"),
                    params.get("port"),
                    params.get("sslmode"),
                )
            return conn

        except psycopg2.OperationalError as e:
            logger.warning(f"Database connection attempt {attempt + 1} failed: {e}")

            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise


def test_db_connection():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        row = cursor.fetchone()
        if row is None or row[0] != 1:
            raise RuntimeError("Unexpected SELECT 1 result")
        logger.info("Database connection test succeeded")
        return True
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def store_panel_feed(panel_name, source_feed, payload_data):
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            INSERT INTO dashboard.panel_feed (
                panel_name,
                source_feed,
                payload,
                collected_at
            )
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """

        cursor.execute(
            query,
            (
                panel_name,
                source_feed,
                Json(payload_data),
                datetime.utcnow(),
            ),
        )

        record_id = cursor.fetchone()[0]
        conn.commit()

        logger.info(f"Inserted record into dashboard.panel_feed with id={record_id}")
        return record_id

    except Exception:
        if conn:
            conn.rollback()
        raise

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def cleanup_old_data(retention_days, panel_name=None):
    conn = None
    cursor = None

    try:
        cutoff = datetime.utcnow() - timedelta(days=retention_days)

        conn = get_db_connection()
        cursor = conn.cursor()

        if panel_name:
            query = """
                DELETE FROM dashboard.panel_feed
                WHERE collected_at < %s
                  AND panel_name = %s
            """
            cursor.execute(query, (cutoff, panel_name))
        else:
            query = """
                DELETE FROM dashboard.panel_feed
                WHERE collected_at < %s
            """
            cursor.execute(query, (cutoff,))

        deleted_rows = cursor.rowcount
        conn.commit()

        logger.info(f"Cleanup complete. Deleted rows: {deleted_rows}")
        return deleted_rows

    except Exception:
        if conn:
            conn.rollback()
        raise

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    test_db_connection()
    print("OK: database connection test passed")


if __name__ == "__main__":
    main()
