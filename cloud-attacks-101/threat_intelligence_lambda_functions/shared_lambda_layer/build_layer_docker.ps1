# Build Lambda layer zip via Docker (same as build_layer_docker.sh).
# Requires Docker Desktop. Run from this directory.
param(
    [ValidateSet("3.12", "3.11", "3.10")]
    [string]$PythonVersion = "3.12"
)

$ErrorActionPreference = "Stop"
$outZip = "layer-$PythonVersion.zip"
$site = "python/lib/python$PythonVersion/site-packages"

if (Test-Path "python") { Remove-Item -Recurse -Force "python" }
if (Test-Path $outZip) { Remove-Item -Force $outZip }

Write-Host "Building layer for Python $PythonVersion -> $outZip"

# Lambda base image entrypoint expects a handler; override so we can run pip.
docker run --rm -v "${PWD}:/out" -w /out --entrypoint /bin/bash `
  "public.ecr.aws/lambda/python:$PythonVersion" `
  -c "pip install -r /out/requirements.txt -t /out/$site --no-cache-dir"

if (Test-Path $outZip) { Remove-Item -Force $outZip }
Compress-Archive -Path "python" -DestinationPath $outZip -Force

Write-Host "Done: $outZip"
