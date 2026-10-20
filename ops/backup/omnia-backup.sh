#!/usr/bin/env bash
# Omnia Platform — backup de PostgreSQL + volumes de mídia, com manifesto, SHA256,
# criptografia opcional (GPG, chave pública) e retenção.
#
# Não contém credenciais: o dump usa o usuário do próprio container do Postgres.
# Configuração por variáveis de ambiente ou arquivo (BACKUP_ENV_FILE). Ver backup.env.example.
#
# Uso:  BACKUP_ENV_FILE=/caminho/backup.env ./omnia-backup.sh [--dry-run]
set -Eeuo pipefail
umask 077

if [[ -n "${BACKUP_ENV_FILE:-}" ]]; then
  # shellcheck disable=SC1090
  source "$BACKUP_ENV_FILE"
fi

BACKUP_LABEL="${BACKUP_LABEL:?defina BACKUP_LABEL (ex.: production, dev)}"
PG_CONTAINER="${PG_CONTAINER:?defina PG_CONTAINER}"
PG_DATABASE="${PG_DATABASE:-}"
MEDIA_VOLUMES="${MEDIA_VOLUMES:-}"
EXTRA_FILES="${EXTRA_FILES:-}"
ENV_FILES_KEYS_ONLY="${ENV_FILES_KEYS_ONLY:-}"
RECORD_CONTAINERS="${RECORD_CONTAINERS:-}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/omnia}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
RETENTION_MIN_KEEP="${RETENTION_MIN_KEEP:-7}"
MIN_FREE_GB="${MIN_FREE_GB:-5}"
FREE_SPACE_FACTOR="${FREE_SPACE_FACTOR:-3}"
ENCRYPT="${ENCRYPT:-none}"
GPG_RECIPIENT="${GPG_RECIPIENT:-}"
HELPER_IMAGE="${HELPER_IMAGE:-alpine:3.20}"
ALERT_COMMAND="${ALERT_COMMAND:-}"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

LABEL_DIR="$BACKUP_ROOT/$BACKUP_LABEL"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$LABEL_DIR/$STAMP"
PARTIAL="$DEST.partial"
LOG_FILE="$LABEL_DIR/backup.log"
START_EPOCH="$(date +%s)"

log() {
  local line
  line="$(date -u +%FT%TZ) [$BACKUP_LABEL] $*"
  echo "$line"
  [[ -d "$LABEL_DIR" ]] && echo "$line" >>"$LOG_FILE" || true
}

fail() {
  log "ERRO: $*"
  exit 1
}

on_error() {
  local code=$?
  log "FALHA (código $code) na linha ${BASH_LINENO[0]}; backup parcial removido."
  [[ -d "$PARTIAL" ]] && rm -rf -- "$PARTIAL"
  if [[ -n "$ALERT_COMMAND" ]]; then
    OMNIA_BACKUP_STATUS=failed OMNIA_BACKUP_LABEL="$BACKUP_LABEL" bash -c "$ALERT_COMMAND" || true
  fi
  exit "$code"
}
trap on_error ERR

psql_in() {
  # Consulta somente leitura dentro do container (usuário/banco do próprio container).
  docker exec -i -e OMNIA_DB="${DB_NAME:-}" "$PG_CONTAINER" sh -c \
    'psql -X -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "${OMNIA_DB:-$POSTGRES_DB}" -At' \
    <<<"SET default_transaction_read_only = on; $1"
}

# --- Pré-verificações -------------------------------------------------------
command -v docker >/dev/null || fail "docker ausente"
command -v sha256sum >/dev/null || fail "sha256sum ausente"
[[ "$(docker inspect -f '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null)" == "true" ]] ||
  fail "container $PG_CONTAINER não está em execução"
DB_NAME="$(docker exec -e OMNIA_DB="${PG_DATABASE:-}" "$PG_CONTAINER" sh -c 'echo "${OMNIA_DB:-$POSTGRES_DB}"')"
[[ -n "$DB_NAME" ]] || fail "não foi possível determinar o banco"
for vol in $MEDIA_VOLUMES; do
  docker volume inspect "$vol" >/dev/null 2>&1 || fail "volume $vol não existe"
done
if [[ "$ENCRYPT" == "gpg" ]]; then
  command -v gpg >/dev/null || fail "ENCRYPT=gpg mas gpg ausente"
  [[ -n "$GPG_RECIPIENT" ]] || fail "ENCRYPT=gpg exige GPG_RECIPIENT (chave pública)"
  gpg --batch --list-keys "$GPG_RECIPIENT" >/dev/null 2>&1 || fail "chave pública $GPG_RECIPIENT não encontrada"
elif [[ "$ENCRYPT" != "none" ]]; then
  fail "ENCRYPT inválido: $ENCRYPT (use none ou gpg)"
fi

DB_BYTES="$(docker exec -e OMNIA_DB="$DB_NAME" "$PG_CONTAINER" sh -c \
  'psql -X -U "$POSTGRES_USER" -d "$OMNIA_DB" -At -c "select pg_database_size(current_database())"')"
MEDIA_BYTES=0
for vol in $MEDIA_VOLUMES; do
  b="$(docker run --rm -v "$vol":/src:ro "$HELPER_IMAGE" sh -c 'du -sb /src | cut -f1')"
  MEDIA_BYTES=$((MEDIA_BYTES + b))
done
mkdir -p "$LABEL_DIR"
chmod 700 "$LABEL_DIR"
FREE_BYTES="$(df -B1 --output=avail "$LABEL_DIR" | tail -1 | tr -d ' ')"
NEED_BYTES=$(((DB_BYTES + MEDIA_BYTES) * FREE_SPACE_FACTOR))
MIN_BYTES=$((MIN_FREE_GB * 1024 * 1024 * 1024))
(( NEED_BYTES < MIN_BYTES )) && NEED_BYTES=$MIN_BYTES
log "banco=$DB_NAME db_bytes=$DB_BYTES media_bytes=$MEDIA_BYTES livre=$FREE_BYTES necessário=$NEED_BYTES"
(( FREE_BYTES >= NEED_BYTES )) || fail "espaço insuficiente em $LABEL_DIR"

if (( DRY_RUN )); then
  log "DRY-RUN: destino=$DEST volumes=[${MEDIA_VOLUMES:-nenhum}] criptografia=$ENCRYPT retenção=${RETENTION_DAYS}d/min${RETENTION_MIN_KEEP}"
  trap - ERR
  exit 0
fi

# --- Exclusividade -------------------------------------------------------------
exec 9>"$LABEL_DIR/.lock"
flock -n 9 || fail "outro backup de $BACKUP_LABEL em execução"

mkdir "$PARTIAL"
log "início -> $DEST"

# --- PostgreSQL -----------------------------------------------------------------
docker exec -e OMNIA_DB="$DB_NAME" "$PG_CONTAINER" sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$OMNIA_DB" --format=custom --no-owner --no-acl' >"$PARTIAL/database.dump"
docker exec "$PG_CONTAINER" sh -c 'pg_dumpall -U "$POSTGRES_USER" --globals-only --no-role-passwords' \
  >"$PARTIAL/globals.sql"
[[ "$(head -c 5 "$PARTIAL/database.dump")" == "PGDMP" ]] || fail "dump sem assinatura PGDMP"
docker exec -i "$PG_CONTAINER" pg_restore -l <"$PARTIAL/database.dump" >"$PARTIAL/database.toc"
TABLE_DATA="$(grep -c ' TABLE DATA ' "$PARTIAL/database.toc" || true)"
(( TABLE_DATA > 0 )) || fail "catálogo do dump sem dados de tabelas"

PG_VERSION="$(docker exec "$PG_CONTAINER" sh -c 'postgres --version' | grep -oE '[0-9]+\.[0-9]+' | head -n 1)"
MIGRATIONS="$(psql_in "select count(*) from payload_migrations" 2>/dev/null || echo n/a)"
psql_in "select format('%s|%s', relname, n_live_tup) from pg_stat_user_tables order by relname" \
  >"$PARTIAL/table_estimates.txt" 2>/dev/null || true
psql_in "select format('select %L || ''|'' || count(*) from public.%I;', table_name, table_name)
  from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name" |
  docker exec -i -e OMNIA_DB="$DB_NAME" "$PG_CONTAINER" sh -c \
    'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$OMNIA_DB" -At' >"$PARTIAL/table_counts.txt"

# --- Volumes de mídia ----------------------------------------------------------
MEDIA_JSON=""
for vol in $MEDIA_VOLUMES; do
  docker run --rm -v "$vol":/src:ro -v "$PARTIAL":/out "$HELPER_IMAGE" \
    sh -c "tar -czf /out/volume-$vol.tgz -C /src . && find /src -type f | wc -l > /out/volume-$vol.files && du -sb /src | cut -f1 > /out/volume-$vol.bytes"
  gzip -t "$PARTIAL/volume-$vol.tgz"
  MEDIA_JSON+="{\"volume\":\"$vol\",\"files\":$(cat "$PARTIAL/volume-$vol.files"),\"bytes\":$(cat "$PARTIAL/volume-$vol.bytes")},"
done

# --- Configuração (sem segredos) ---------------------------------------------
mkdir -p "$PARTIAL/config"
for f in $EXTRA_FILES; do
  [[ -f "$f" ]] && cp -- "$f" "$PARTIAL/config/$(basename "$f")"
done
for f in $ENV_FILES_KEYS_ONLY; do
  # Apenas os NOMES das variáveis, nunca os valores.
  [[ -f "$f" ]] && sed -E 's/=.*//' "$f" | grep -vE '^\s*(#|$)' >"$PARTIAL/config/$(basename "$f").keys"
done
for c in $RECORD_CONTAINERS; do
  docker inspect -f '{{.Name}} {{.Config.Image}} {{.Image}}' "$c" >>"$PARTIAL/config/containers.txt" 2>/dev/null || true
done

# --- Criptografia -----------------------------------------------------------------
if [[ "$ENCRYPT" == "gpg" ]]; then
  for f in "$PARTIAL"/database.dump "$PARTIAL"/globals.sql "$PARTIAL"/volume-*.tgz; do
    [[ -f "$f" ]] || continue
    gpg --batch --yes --trust-model always --recipient "$GPG_RECIPIENT" --output "$f.gpg" --encrypt "$f"
    rm -f -- "$f"
  done
fi

# --- Manifesto e checksums -----------------------------------------------------
cat >"$PARTIAL/MANIFEST.json" <<JSON
{
  "label": "$BACKUP_LABEL",
  "created_at_utc": "$STAMP",
  "database": "$DB_NAME",
  "postgres_version": "$PG_VERSION",
  "database_bytes": $DB_BYTES,
  "payload_migrations": "$MIGRATIONS",
  "table_data_entries": $TABLE_DATA,
  "media": [${MEDIA_JSON%,}],
  "encryption": "$ENCRYPT",
  "tool": "ops/backup/omnia-backup.sh"
}
JSON
(cd "$PARTIAL" && find . -type f ! -name SHA256SUMS -printf '%P\n' | sort | xargs -d '\n' sha256sum >SHA256SUMS)
(cd "$PARTIAL" && sha256sum -c --quiet SHA256SUMS) || fail "verificação SHA256 falhou"
chmod -R go-rwx "$PARTIAL"
mv -- "$PARTIAL" "$DEST"
ln -sfn "$STAMP" "$LABEL_DIR/latest"

# --- Retenção ---------------------------------------------------------------------
mapfile -t ALL < <(find "$LABEL_DIR" -mindepth 1 -maxdepth 1 -type d -regextype posix-extended \
  -regex '.*/[0-9]{8}T[0-9]{6}Z' -printf '%f\n' | sort -r)
KEPT=0
for name in "${ALL[@]}"; do
  KEPT=$((KEPT + 1))
  (( KEPT <= RETENTION_MIN_KEEP )) && continue
  if [[ -n "$(find "$LABEL_DIR/$name" -maxdepth 0 -mtime +"$RETENTION_DAYS")" ]]; then
    rm -rf -- "${LABEL_DIR:?}/$name"
    log "retenção: removido $name"
  fi
done

SIZE="$(du -sh "$DEST" | cut -f1)"
log "concluído $STAMP tamanho=$SIZE duração=$(($(date +%s) - START_EPOCH))s tabelas=$TABLE_DATA migrations=$MIGRATIONS"
if [[ -n "$ALERT_COMMAND" && "${ALERT_ON_SUCCESS:-0}" == "1" ]]; then
  OMNIA_BACKUP_STATUS=ok OMNIA_BACKUP_LABEL="$BACKUP_LABEL" OMNIA_BACKUP_PATH="$DEST" bash -c "$ALERT_COMMAND" || true
fi
