#!/bin/bash
# Așteaptă propagarea DNS și activează SSL când e gata
# Rulează: bash wait-and-setup-ssl.sh
# Adaugă mai întâi recordul DNS: reader.aithentic.ro A 89.46.7.215

DOMAIN="reader.aithentic.ro"
SERVER_IP="89.46.7.215"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Așteptăm ca $DOMAIN să pointeze la $SERVER_IP ==="
echo "Adaugă recordul A în panoul DNS dacă nu l-ai făcut deja."
echo ""

while true; do
  RESOLVED=$(dig +short $DOMAIN A @8.8.8.8 2>/dev/null | head -1)
  if [ -n "$RESOLVED" ] && [ "$RESOLVED" = "$SERVER_IP" ]; then
    echo ""
    echo "DNS propagat! $DOMAIN -> $RESOLVED"
    echo ""
    bash "$SCRIPT_DIR/setup-ssl-reader.sh"
    exit $?
  fi
  echo "$(date '+%H:%M:%S') - DNS încă nu e configurat (rezolvat: ${RESOLVED:-nimic})"
  sleep 30
done
