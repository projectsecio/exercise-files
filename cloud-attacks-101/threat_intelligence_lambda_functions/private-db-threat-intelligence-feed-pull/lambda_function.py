"""
Lambda 2 — triggered by S3 when a new feed JSON object is written (Lambda 1).

WHERE TO CONFIGURE THE S3 → LAMBDA EVENT (AWS Console):
1. Open S3 → your output bucket → Properties → Event notifications → Create event notification.
2. Name: e.g. threat-intel-feed-ingest
3. Prefix (optional): match Lambda 1 keys, e.g. threat-intel/ or leave empty for whole bucket
4. Suffix: .json
5. Event types: s3:ObjectCreated:* (or Put, Post, CompleteMultipartUpload as needed)
6. Destination: Lambda function → select this function (Lambda 2)
7. Confirm the Lambda resource policy prompt so S3 may invoke the function

Alternatively: Lambda console → this function → Add trigger → S3 → pick bucket, event type, prefix/suffix.

IAM: Lambda execution role needs s3:GetObject on the bucket/prefix and VPC/EC2 access to Postgres as before.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.parse
from typing import Any

import boto3
from botocore.config import Config

from db import store_panel_feed

logger = logging.getLogger()
logger.setLevel(logging.INFO)

_s3 = None


def _s3_client():
    global _s3
    if _s3 is None:
        # Lambda sets AWS_REGION; explicit region avoids wrong-endpoint hangs.
        region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-2"
        cfg = Config(
            connect_timeout=10,
            read_timeout=30,
            retries={"max_attempts": 2, "mode": "standard"},
        )
        _s3 = boto3.client("s3", region_name=region, config=cfg)
        logger.info("S3 client ready region=%s", region)
    return _s3


def _get_object_json(bucket: str, key: str) -> dict[str, Any]:
    logger.info("S3 GetObject starting bucket=%s key=%s", bucket, key)
    client = _s3_client()
    logger.info("S3 client obtained, invoking get_object")
    resp = client.get_object(Bucket=bucket, Key=key)
    logger.info("S3 GetObject HTTP OK, reading body")
    body = resp["Body"].read().decode("utf-8")
    logger.info("S3 body read bytes=%s", len(body))
    return json.loads(body)


def ingest_feed_document(doc: dict[str, Any]) -> int:
    """
    Map Lambda 1 JSON document to dashboard.panel_feed via db.store_panel_feed.
    Extend here if you add target_table or multiple ingest paths later.
    """
    target = doc.get("target_table", "dashboard.panel_feed")
    if target != "dashboard.panel_feed":
        raise ValueError(f"Unsupported target_table: {target!r} (only dashboard.panel_feed for now)")

    panel_name = doc.get("panel_name")
    source_feed = doc.get("source_feed", "")
    payload = doc.get("payload")

    if not panel_name:
        raise ValueError("Document missing required field: panel_name")
    if payload is None:
        raise ValueError("Document missing required field: payload")

    return store_panel_feed(
        panel_name=panel_name,
        source_feed=source_feed,
        payload_data=payload,
    )


def process_s3_record(record: dict[str, Any]) -> dict[str, Any]:
    s3 = record.get("s3") or {}
    bucket = (s3.get("bucket") or {}).get("name")
    raw_key = (s3.get("object") or {}).get("key", "")
    key = urllib.parse.unquote_plus(raw_key)

    if not bucket or not key:
        raise ValueError(f"Invalid S3 record: {record!r}")

    if not key.endswith(".json"):
        logger.info("Skipping non-json key: %s", key)
        return {"skipped": True, "reason": "not_json_suffix", "key": key}

    logger.info("Processing s3://%s/%s", bucket, key)
    doc = _get_object_json(bucket, key)
    record_id = ingest_feed_document(doc)

    return {
        "skipped": False,
        "s3_bucket": bucket,
        "s3_key": key,
        "record_id": record_id,
    }


def lambda_handler(event, context):
    """
    S3 sends a batch of records. Process each; collect results.
    """
    logger.info("Event: %s", json.dumps(event, default=str)[:8000])

    if not isinstance(event, dict) or "Records" not in event:
        return {
            "statusCode": 400,
            "body": json.dumps(
                {"error": "Expected S3 event with Records[]", "hint": "Use S3 event notification trigger"}
            ),
        }

    results = []
    errors = []

    for i, record in enumerate(event["Records"]):
        try:
            if record.get("eventSource") != "aws:s3":
                continue
            results.append(process_s3_record(record))
        except Exception as e:
            logger.exception("Failed record %s", i)
            errors.append({"index": i, "error": str(e)})

    status = 200 if not errors else 207
    return {
        "statusCode": status,
        "body": json.dumps({"processed": results, "errors": errors}),
    }
