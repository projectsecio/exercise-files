#!/usr/bin/env bash
# Build a Lambda layer zip using the official Lambda Python image (Amazon Linux-compatible wheels).
# Usage: ./build_layer_docker.sh [3.12|3.11|3.10]
# If you see 'bash\r' errors on WSL, the file had Windows CRLF — use: sed -i 's/\r$//' build_layer_docker.sh
set -euo pipefail

PY="${1:-3.12}"
OUT_ZIP="layer-${PY}.zip"
SITE="python/lib/python${PY}/site-packages"

rm -rf python "${OUT_ZIP}"

echo "Building layer for Python ${PY} -> ${OUT_ZIP}"

# Lambda base image entrypoint expects a handler; override so we can run pip.
docker run --rm -v "$PWD:/out" -w /out --entrypoint /bin/bash \
  "public.ecr.aws/lambda/python:${PY}" \
  -c "pip install -r /out/requirements.txt -t /out/${SITE} --no-cache-dir"

rm -f "${OUT_ZIP}"
zip -r "${OUT_ZIP}" python

echo "Done: ${OUT_ZIP} (upload as Lambda layer, attach to both functions)"
