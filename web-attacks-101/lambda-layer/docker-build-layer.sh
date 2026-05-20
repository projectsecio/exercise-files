#!/bin/bash
# Run inside: public.ecr.aws/lambda/python:3.12 with --entrypoint bash
# Mounts: requirements -> /tmp/requirements.txt, mmdb -> /tmp/GeoLite2-Country.mmdb, dist -> /out
#
# Lambda merges the ZIP root into /opt. So:
#   - python/lib/...  -> /opt/python/lib/...  (correct for imports)
#   - GeoLite2-Country.mmdb at ZIP root -> /opt/GeoLite2-Country.mmdb
# Do NOT use a nested opt/ folder in the ZIP (that becomes /opt/opt/...).
set -euo pipefail
mkdir -p /tmp/work/python/lib/python3.12/site-packages
pip install --no-cache-dir -r requirements.txt -t /tmp/work/python/lib/python3.12/site-packages
cp GeoLite2-Country.mmdb /tmp/work/GeoLite2-Country.mmdb
cd /tmp/work
python3 <<'PY'
import os
import zipfile

out = "threat-intel-lambda-layer.zip"
os.chdir("/tmp/work")
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.write("GeoLite2-Country.mmdb", "GeoLite2-Country.mmdb")
    for root, _dirs, files in os.walk("python"):
        for name in files:
            fn = os.path.join(root, name)
            z.write(fn, fn)
PY
echo "OK: wrote threat-intel-lambda-layer.zip"
ls -la
