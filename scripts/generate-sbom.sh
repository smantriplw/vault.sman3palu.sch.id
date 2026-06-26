#!/bin/bash
# SBOM Generation — CycloneDX format
# Requires: `bun install -g @cyclonedx/bom`
#
# ISO 27002 8.8 — Software Bill of Materials
# Run periodically to track dependency vulnerabilities

set -euo pipefail

mkdir -p sbom

echo "Generating SBOM for API..."
if command -v bom &>/dev/null; then
  bom generate -p apps/api/package.json -o sbom/api.bom.json
else
  echo "WARNING: @cyclonedx/bom not found. Install with: bun install -g @cyclonedx/bom"
  echo "Falling back to npm ls..."
  cd apps/api && npm ls --all --json > ../../sbom/api-deps.json 2>/dev/null || true
  cd ../..
fi

echo "Generating SBOM for Web..."
if command -v bom &>/dev/null; then
  bom generate -p apps/web/package.json -o sbom/web.bom.json
else
  cd apps/web && npm ls --all --json > ../../sbom/web-deps.json 2>/dev/null || true
  cd ../..
fi

echo "SBOM written to ./sbom/"
