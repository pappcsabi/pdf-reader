#!/bin/bash
# Script pentru activarea SSL pe reader.aithentic.ro
# Rulează pe server după ce ai adăugat recordul DNS: reader.aithentic.ro A 89.46.7.215

set -e

DOMAIN="reader.aithentic.ro"
SERVER_IP="89.46.7.215"
EMAIL="admin@aithentic.ro"

echo "=== Verificare DNS pentru $DOMAIN ==="
RESOLVED_IP=$(dig +short $DOMAIN A @8.8.8.8 | head -1)

if [ -z "$RESOLVED_IP" ]; then
  echo "EROARE: $DOMAIN nu se rezolvă. Adaugă în panoul DNS (CyberFolks):"
  echo "  Tip: A"
  echo "  Nume: reader"
  echo "  Valoare: $SERVER_IP"
  echo ""
  echo "După 5-15 minute, rulează din nou: bash setup-ssl-reader.sh"
  exit 1
fi

if [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
  echo "ATENȚIE: $DOMAIN rezolvă la $RESOLVED_IP, dar serverul e $SERVER_IP"
  echo "Verifică că recordul A pointează la $SERVER_IP"
  exit 1
fi

echo "DNS OK: $DOMAIN -> $RESOLVED_IP"
echo ""
echo "=== Activare SSL cu Certbot ==="

sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

echo ""
echo "=== Gata! Site-ul este accesibil la https://$DOMAIN ==="
