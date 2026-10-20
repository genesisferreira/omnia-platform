#!/usr/bin/env bash
# Teste de restauração em ambiente DESCARTÁVEL: Postgres temporário em rede Docker interna
# (sem saída para a internet) e dados em tmpfs. Nunca toca o banco ou os volumes de origem.
# Compara a contagem de linhas de cada tabela e os arquivos de mídia com o que o backup registrou.
#
# Uso: ./omnia-restore-test.sh <diretório-do-backup>
set -Eeuo pipefail
DIR="${1:?informe o diretório do backup}"
PG_IMAGE="${PG_IMAGE:-postgres:16-alpine}"
HELPER_IMAGE="${HELPER_IMAGE:-alpine:3.20}"
ID="omnia-restore-$(date +%s)-$$"
NET="$ID-net"
PG="$ID-pg"
WORK="$(mktemp -d)"
T0="$(date +%s)"

cleanup() {
  docker rm -f "$PG" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf -- "$WORK"
}
trap cleanup EXIT

"$(dirname "$0")/omnia-backup-verify.sh" "$DIR" >/dev/null || { echo "RESTORE_TEST=FAIL verificação prévia"; exit 1; }

DUMP="$DIR/database.dump"
if [[ -f "$DIR/database.dump.gpg" ]]; then
  gpg --batch --quiet --output "$WORK/database.dump" --decrypt "$DIR/database.dump.gpg"
  DUMP="$WORK/database.dump"
fi

docker network create --internal "$NET" >/dev/null
docker run -d --name "$PG" --network "$NET" --memory 768m \
  -e POSTGRES_USER=restore -e POSTGRES_PASSWORD="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')" \
  -e POSTGRES_DB=restored --tmpfs /var/lib/postgresql/data:rw,size=2g "$PG_IMAGE" >/dev/null
for _ in $(seq 1 90); do
  if docker logs "$PG" 2>&1 | grep -q 'PostgreSQL init process complete' &&
    docker exec "$PG" pg_isready -U restore -d restored >/dev/null 2>&1; then break; fi
  sleep 1
done
sleep 2
docker exec -i "$PG" pg_restore -U restore -d restored --no-owner --no-acl --exit-on-error <"$DUMP"
T_DB="$(date +%s)"
echo "OK   banco restaurado em $((T_DB - T0))s"

docker exec -i "$PG" psql -X -U restore -d restored -At <<'SQL' |
SELECT format('select %L || ''|'' || count(*) from public.%I;', table_name, table_name)
  FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;
SQL
  docker exec -i "$PG" psql -X -v ON_ERROR_STOP=1 -U restore -d restored -At >"$WORK/restored_counts.txt"

if [[ -f "$DIR/table_counts.txt" ]]; then
  if diff -q <(sort "$DIR/table_counts.txt") <(sort "$WORK/restored_counts.txt") >/dev/null; then
    echo "OK   contagem de linhas idêntica em $(wc -l <"$WORK/restored_counts.txt") tabelas"
  else
    echo "FAIL contagens divergentes:"
    diff <(sort "$DIR/table_counts.txt") <(sort "$WORK/restored_counts.txt") | head -n 20
    echo "RESTORE_TEST=FAIL"
    exit 1
  fi
fi

for t in "$DIR"/volume-*.tgz "$DIR"/volume-*.tgz.gpg; do
  [[ -f "$t" ]] || continue
  vol="$(basename "$t")"; vol="${vol#volume-}"; vol="${vol%.gpg}"; vol="${vol%.tgz}"
  src="$t"
  if [[ "$t" == *.gpg ]]; then
    gpg --batch --quiet --output "$WORK/$vol.tgz" --decrypt "$t"
    src="$WORK/$vol.tgz"
  fi
  mkdir -p "$WORK/media-$vol"
  tar -xzf "$src" -C "$WORK/media-$vol"
  files="$(find "$WORK/media-$vol" -type f | wc -l)"
  expected="$(cat "$DIR/volume-$vol.files" 2>/dev/null || echo '?')"
  if [[ "$files" == "$expected" ]]; then
    echo "OK   mídia $vol: $files arquivos"
  else
    echo "FAIL mídia $vol: $files arquivos (esperado $expected)"
    echo "RESTORE_TEST=FAIL"
    exit 1
  fi
done

echo "RESTORE_TEST=PASS duração_total=$(($(date +%s) - T0))s"
