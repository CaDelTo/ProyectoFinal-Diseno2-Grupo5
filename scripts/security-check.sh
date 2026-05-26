#!/bin/sh
# C-05 (spec 012) — Verificación de secretos hardcodeados y código peligroso.
# Uso: ./scripts/security-check.sh
# Retorna exit 1 si encuentra violaciones.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0

echo "=== Chequeo de secretos y código peligroso ==="

# 1. dangerouslySetInnerHTML en frontend
DANGEROUS=$(grep -r "dangerouslySetInnerHTML" "$ROOT/frontend/src" 2>/dev/null | wc -l | tr -d ' ')
if [ "$DANGEROUS" -gt 0 ]; then
  echo "❌  dangerouslySetInnerHTML encontrado en frontend/src/ ($DANGEROUS ocurrencias)"
  grep -r "dangerouslySetInnerHTML" "$ROOT/frontend/src" 2>/dev/null
  ERRORS=$((ERRORS + 1))
else
  echo "✅  Sin dangerouslySetInnerHTML en frontend/src/"
fi

# 2. Secretos hardcodeados en services/ (excluyendo archivos de test)
# Busca patrones tipo ALGO_SECRET = "valor_real" fuera de variables de entorno
SECRETS=$(find "$ROOT/services" -name "*.ts" -o -name "*.js" 2>/dev/null \
  | grep -v "node_modules" | grep -v "dist" \
  | grep -v ".spec." | grep -v ".test." \
  | xargs grep -lE "\b(SECRET|PASSWORD|API_KEY|TOKEN)\b\s*=\s*[\"'][^\$\{'\"]" 2>/dev/null \
  | wc -l | tr -d ' ')
if [ "$SECRETS" -gt 0 ]; then
  echo "❌  Posibles secretos hardcodeados en services/ ($SECRETS archivos)"
  ERRORS=$((ERRORS + 1))
else
  echo "✅  Sin secretos hardcodeados detectados en services/"
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "❌  $ERRORS violación(es) de seguridad encontradas."
  exit 1
else
  echo ""
  echo "✅  Todas las verificaciones de seguridad pasaron."
fi
