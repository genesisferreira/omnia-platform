#!/usr/bin/env bash
# Verifica um backup gerado por omnia-backup.sh sem restaurá-lo.
# Uso: ./omnia-backup-verify.sh <diretório-do-backup> [--deep]
#   --deep: também valida o catálogo do dump (descriptografa em memória se necessário).
set -Eeuo pipefail
DIR="${1:?informe o diretório do backup}"
DEEP=0
[[ "${2:-}" == "--deep" ]] && DEEP=1
PG_IMAGE="${PG_IMAGE:-postgres:16-alpine}"
ok() { echo "OK   $*"; }
bad() { echo "FAIL $*"; exit 1; }

[[ -d "$DIR" ]] || bad "diretório inexistente: $DIR"
[[ -f "$DIR/SHA256SUMS" ]] || bad "SHA256SUMS ausente"
[[ -f "$DIR/MANIFEST.json" ]] || bad "MANIFEST.json ausente"
(cd "$DIR" && sha256sum -c --quiet SHA256SUMS) || bad "checksum divergente"
ok "checksums ($(wc -l <"$DIR/SHA256SUMS") arquivos)"

if [[ -f "$DIR/database.dump" ]]; then
  [[ "$(head -c 5 "$DIR/database.dump")" == "PGDMP" ]] || bad "dump sem assinatura PGDMP"
  ok "assinatura do dump"
elif [[ -f "$DIR/database.dump.gpg" ]]; then
  ok "dump criptografado (GPG)"
else
  bad "dump ausente"
fi
for t in "$DIR"/volume-*.tgz; do
  [[ -f "$t" ]] || continue
  gzip -t "$t" || bad "arquivo de volume corrompido: $(basename "$t")"
  ok "integridade gzip $(basename "$t")"
done

if (( DEEP )); then
  if [[ -f "$DIR/database.dump.gpg" ]]; then
    n="$(gpg --batch --quiet --decrypt "$DIR/database.dump.gpg" | docker run --rm -i "$PG_IMAGE" pg_restore -l | grep -c ' TABLE DATA ' || true)"
  else
    n="$(docker run --rm -i "$PG_IMAGE" pg_restore -l <"$DIR/database.dump" | grep -c ' TABLE DATA ' || true)"
  fi
  (( n > 0 )) || bad "catálogo do dump vazio"
  ok "catálogo do dump ($n entradas de dados)"
fi
echo "VERIFY=PASS $DIR"
