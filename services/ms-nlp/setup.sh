#!/bin/sh
# Setup script: espera a que n8n esté listo, crea credencial Postgres RAG e importa el workflow.
# Se ejecuta como servicio efímero en docker-compose (ms-nlp-setup).

set -e

N8N_URL="http://ms-nlp:5678"
WORKFLOW_FILE="/workflows/rag-chat.json"

echo "[setup] Esperando que n8n esté disponible..."
until wget -qO- "${N8N_URL}/healthz" > /dev/null 2>&1; do
  sleep 3
done
echo "[setup] n8n activo."

# ── 1. Login para obtener cookie de sesión ──────────────────────────────────
N8N_USER="${N8N_BASIC_AUTH_USER:-admin@localhost}"
N8N_PASS="${N8N_BASIC_AUTH_PASSWORD:-admin1234}"

# Intentar login — si ya existe sesión, continúa igual
LOGIN_RESP=$(wget -qO- --post-data="{\"email\":\"${N8N_USER}\",\"password\":\"${N8N_PASS}\"}" \
  --header="Content-Type: application/json" \
  --save-cookies /tmp/n8n_cookies.txt \
  --keep-session-cookies \
  "${N8N_URL}/rest/login" 2>/dev/null || true)

echo "[setup] Login: ${LOGIN_RESP}"

# ── 2. Verificar si ya existe el workflow RAG Chat ──────────────────────────
EXISTING=$(wget -qO- \
  --load-cookies /tmp/n8n_cookies.txt \
  "${N8N_URL}/rest/workflows" 2>/dev/null | grep -c '"RAG Chat"' || true)

if [ "$EXISTING" -gt "0" ]; then
  echo "[setup] Workflow 'RAG Chat' ya existe. Nada que hacer."
  exit 0
fi

# ── 3. Crear credencial Postgres RAG ────────────────────────────────────────
DB_HOST="${DB_POSTGRESDB_HOST:-db}"
DB_PORT="${DB_POSTGRESDB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-datos}"
DB_USER="${POSTGRES_USER:-app}"
DB_PASS="${POSTGRES_PASSWORD:-app}"

CRED_PAYLOAD="{
  \"name\": \"Postgres RAG\",
  \"type\": \"postgres\",
  \"data\": {
    \"host\": \"${DB_HOST}\",
    \"port\": ${DB_PORT},
    \"database\": \"${DB_NAME}\",
    \"user\": \"${DB_USER}\",
    \"password\": \"${DB_PASS}\",
    \"ssl\": \"disable\"
  }
}"

CRED_RESP=$(wget -qO- \
  --post-data="${CRED_PAYLOAD}" \
  --header="Content-Type: application/json" \
  --load-cookies /tmp/n8n_cookies.txt \
  "${N8N_URL}/rest/credentials" 2>/dev/null || echo "ERROR")

CRED_ID=$(echo "$CRED_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "[setup] Credential creada: id=${CRED_ID}"

# ── 4. Parchear workflow JSON con el nuevo credential ID ────────────────────
sed "s/jwmJZvXfgVvLvayB/${CRED_ID}/g" "${WORKFLOW_FILE}" > /tmp/rag-chat-patched.json

# ── 5. Importar workflow ─────────────────────────────────────────────────────
IMPORT_RESP=$(wget -qO- \
  --post-file=/tmp/rag-chat-patched.json \
  --header="Content-Type: application/json" \
  --load-cookies /tmp/n8n_cookies.txt \
  "${N8N_URL}/rest/workflows" 2>/dev/null || echo "ERROR")

echo "[setup] Import: ${IMPORT_RESP}" | head -c 200

# ── 6. Activar workflow ──────────────────────────────────────────────────────
WF_ID=$(echo "$IMPORT_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$WF_ID" ]; then
  wget -qO- \
    --method=PATCH \
    --body-data="{\"active\":true}" \
    --header="Content-Type: application/json" \
    --load-cookies /tmp/n8n_cookies.txt \
    "${N8N_URL}/rest/workflows/${WF_ID}" > /dev/null 2>&1 || true
  echo "[setup] Workflow ${WF_ID} activado."
fi

echo "[setup] Listo."
