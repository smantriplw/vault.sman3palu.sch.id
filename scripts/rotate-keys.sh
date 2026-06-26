#!/bin/bash
# ISO 27002 8.24 — Key Rotation Script
# Usage: ./scripts/rotate-keys.sh
#
# Generates new ENCRYPTION_KEY and JWT_SECRET
# and prints instructions for safe rotation.

set -euo pipefail

echo "=== Key Rotation Tool ==="
echo ""

NEW_JWT=$(openssl rand -hex 32)
NEW_ENCRYPTION=$(openssl rand -hex 32)

echo "New JWT_SECRET:       $NEW_JWT"
echo "New ENCRYPTION_KEY:   $NEW_ENCRYPTION"
echo ""
echo "=== Rotation Procedure ==="
echo "1. Update .env with the new values"
echo "2. Restart the API service"
echo "3. All existing sessions will be invalidated (users must re-login)"
echo "4. Existing encrypted data remains decryptable with the NEW key"
echo "   because AES-GCM decrypts with whatever key is current."
echo "   WARNING: Data encrypted with the OLD key will be LOST."
echo ""
echo "To rotate without data loss:"
echo "  - Decrypt all secrets with old key first"
echo "  - Update ENCRYPTION_KEY"
echo "  - Re-encrypt all secrets with new key"
echo "  - (Future: planned key migration endpoint)"
