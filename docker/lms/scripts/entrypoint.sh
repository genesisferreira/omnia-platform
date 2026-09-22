#!/usr/bin/env bash
# Omnia LMS — Moodle entrypoint (config from env, optional first install)
set -euo pipefail

DATAROOT="${MOODLE_DATAROOT:-/var/www/moodledata}"
WWWROOT_DIR="/var/www/html"
TEMPLATE="/usr/local/share/omnia-lms/config.php.template"
CONFIG="${WWWROOT_DIR}/config.php"
LOG_DIR="${MOODLE_LOG_DIR:-/var/log/omnia-lms}"

mkdir -p "${DATAROOT}" "${LOG_DIR}" \
  "${DATAROOT}/filedir" "${DATAROOT}/cache" "${DATAROOT}/temp" "${DATAROOT}/trashdir" \
  "${DATAROOT}/localcache" "${DATAROOT}/sessions"
chown -R www-data:www-data "${DATAROOT}" "${LOG_DIR}" || true

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "ERROR: required env ${name} is empty" >&2
    exit 1
  fi
}

require_var MOODLE_WWWROOT
require_var MOODLE_DB_HOST
require_var MOODLE_DB_NAME
require_var MOODLE_DB_USER
require_var MOODLE_DB_PASSWORD
require_var MOODLE_REDIS_HOST
require_var MOODLE_SALT

export MOODLE_DB_PORT="${MOODLE_DB_PORT:-3306}"
export MOODLE_DB_PREFIX="${MOODLE_DB_PREFIX:-mdl_}"
export MOODLE_DATAROOT="${DATAROOT}"
export MOODLE_REDIS_PORT="${MOODLE_REDIS_PORT:-6379}"
export MOODLE_REDIS_SESSION_DB="${MOODLE_REDIS_SESSION_DB:-0}"
export MOODLE_REDIS_CACHE_DB="${MOODLE_REDIS_CACHE_DB:-1}"
export MOODLE_REDIS_PREFIX="${MOODLE_REDIS_PREFIX:-omnia_lms_}"
export MOODLE_SMTP_HOST="${MOODLE_SMTP_HOST:-}"
export MOODLE_SMTP_PORT="${MOODLE_SMTP_PORT:-587}"
export MOODLE_SMTP_SECURE="${MOODLE_SMTP_SECURE:-tls}"
export MOODLE_SMTP_USER="${MOODLE_SMTP_USER:-}"
export MOODLE_SMTP_PASS="${MOODLE_SMTP_PASS:-}"
export MOODLE_SMTP_FROM="${MOODLE_SMTP_FROM:-noreply@omniafrigo.com.br}"

# Escape sed replacement safely
escape_sed() {
  printf '%s' "$1" | sed -e 's/[\/&]/\\&/g'
}

render_config() {
  local tmp
  tmp="$(mktemp)"
  cp "${TEMPLATE}" "${tmp}"
  sed -i \
    -e "s/__MOODLE_DB_HOST__/$(escape_sed "${MOODLE_DB_HOST}")/g" \
    -e "s/__MOODLE_DB_NAME__/$(escape_sed "${MOODLE_DB_NAME}")/g" \
    -e "s/__MOODLE_DB_USER__/$(escape_sed "${MOODLE_DB_USER}")/g" \
    -e "s/__MOODLE_DB_PASSWORD__/$(escape_sed "${MOODLE_DB_PASSWORD}")/g" \
    -e "s/__MOODLE_DB_PREFIX__/$(escape_sed "${MOODLE_DB_PREFIX}")/g" \
    -e "s/__MOODLE_DB_PORT__/$(escape_sed "${MOODLE_DB_PORT}")/g" \
    -e "s/__MOODLE_WWWROOT__/$(escape_sed "${MOODLE_WWWROOT}")/g" \
    -e "s/__MOODLE_DATAROOT__/$(escape_sed "${MOODLE_DATAROOT}")/g" \
    -e "s/__MOODLE_REDIS_HOST__/$(escape_sed "${MOODLE_REDIS_HOST}")/g" \
    -e "s/__MOODLE_REDIS_PORT__/${MOODLE_REDIS_PORT}/g" \
    -e "s/__MOODLE_REDIS_SESSION_DB__/${MOODLE_REDIS_SESSION_DB}/g" \
    -e "s/__MOODLE_REDIS_CACHE_DB__/${MOODLE_REDIS_CACHE_DB}/g" \
    -e "s/__MOODLE_REDIS_PREFIX__/$(escape_sed "${MOODLE_REDIS_PREFIX}")/g" \
    -e "s/__MOODLE_SALT__/$(escape_sed "${MOODLE_SALT}")/g" \
    -e "s/__MOODLE_SMTP_HOST__/$(escape_sed "${MOODLE_SMTP_HOST}")/g" \
    -e "s/__MOODLE_SMTP_PORT__/$(escape_sed "${MOODLE_SMTP_PORT}")/g" \
    -e "s/__MOODLE_SMTP_SECURE__/$(escape_sed "${MOODLE_SMTP_SECURE}")/g" \
    -e "s/__MOODLE_SMTP_USER__/$(escape_sed "${MOODLE_SMTP_USER}")/g" \
    -e "s/__MOODLE_SMTP_PASS__/$(escape_sed "${MOODLE_SMTP_PASS}")/g" \
    -e "s/__MOODLE_SMTP_FROM__/$(escape_sed "${MOODLE_SMTP_FROM}")/g" \
    "${tmp}"
  install -o www-data -g www-data -m 0640 "${tmp}" "${CONFIG}"
  rm -f "${tmp}"
}

wait_for_tcp() {
  local host="$1" port="$2" name="$3" tries="${4:-60}"
  echo "Waiting for ${name} at ${host}:${port}..."
  for ((i = 1; i <= tries; i++)); do
    if (echo >"/dev/tcp/${host}/${port}") >/dev/null 2>&1; then
      echo "${name} is reachable"
      return 0
    fi
    sleep 2
  done
  echo "ERROR: timeout waiting for ${name}" >&2
  exit 1
}

wait_for_tcp "${MOODLE_DB_HOST}" "${MOODLE_DB_PORT}" "MariaDB"
wait_for_tcp "${MOODLE_REDIS_HOST}" "${MOODLE_REDIS_PORT}" "Redis"

render_config

tables_exist() {
  php -r '
    $host = getenv("MOODLE_DB_HOST");
    $user = getenv("MOODLE_DB_USER");
    $pass = getenv("MOODLE_DB_PASSWORD");
    $name = getenv("MOODLE_DB_NAME");
    $port = (int)(getenv("MOODLE_DB_PORT") ?: 3306);
    $prefix = getenv("MOODLE_DB_PREFIX") ?: "mdl_";
    $mysqli = @new mysqli($host, $user, $pass, $name, $port);
    if ($mysqli->connect_errno) { fwrite(STDERR, $mysqli->connect_error); exit(2); }
    $like = $mysqli->real_escape_string($prefix . "config");
    $res = $mysqli->query("SHOW TABLES LIKE \"{$like}\"");
    exit(($res && $res->num_rows > 0) ? 0 : 1);
  '
}

if [[ "${1:-}" == "apache2-foreground" ]] || [[ "${1:-}" == "cron" ]]; then
  if ! tables_exist; then
    if [[ "${MOODLE_AUTO_INSTALL:-0}" == "1" ]]; then
      echo "First boot: running Moodle CLI install..."
      require_var MOODLE_ADMIN_USER
      require_var MOODLE_ADMIN_PASS
      require_var MOODLE_ADMIN_EMAIL
      # install.php writes config.php; we already have one — use install_database.php path
      # Full install when no config would overwrite; with existing config use:
      php admin/cli/install_database.php \
        --agree-license \
        --fullname="${MOODLE_SITE_FULLNAME:-Omnia LMS Engine DEV}" \
        --shortname="${MOODLE_SITE_SHORTNAME:-OmniaLMS}" \
        --adminuser="${MOODLE_ADMIN_USER}" \
        --adminpass="${MOODLE_ADMIN_PASS}" \
        --adminemail="${MOODLE_ADMIN_EMAIL}" \
        --supportemail="${MOODLE_ADMIN_EMAIL}" \
        || {
          # Fallback: fresh install without pre-rendered config
          echo "install_database failed; attempting full install.php"
          rm -f "${CONFIG}"
          php admin/cli/install.php \
            --non-interactive \
            --agree-license \
            --lang=pt_br \
            --wwwroot="${MOODLE_WWWROOT}" \
            --dataroot="${MOODLE_DATAROOT}" \
            --dbtype=mariadb \
            --dbhost="${MOODLE_DB_HOST}" \
            --dbname="${MOODLE_DB_NAME}" \
            --dbuser="${MOODLE_DB_USER}" \
            --dbpass="${MOODLE_DB_PASSWORD}" \
            --dbport="${MOODLE_DB_PORT}" \
            --prefix="${MOODLE_DB_PREFIX}" \
            --fullname="${MOODLE_SITE_FULLNAME:-Omnia LMS Engine DEV}" \
            --shortname="${MOODLE_SITE_SHORTNAME:-OmniaLMS}" \
            --adminuser="${MOODLE_ADMIN_USER}" \
            --adminpass="${MOODLE_ADMIN_PASS}" \
            --adminemail="${MOODLE_ADMIN_EMAIL}" \
            --supportemail="${MOODLE_ADMIN_EMAIL}"
          render_config
        }
      echo "Install complete"
    else
      echo "WARNING: Moodle DB not installed and MOODLE_AUTO_INSTALL!=1" >&2
    fi
  else
    echo "Moodle database already installed"
  fi
fi

if [[ "${1:-}" == "cron" ]]; then
  exec /usr/local/bin/omnia-lms-cron-loop.sh
fi

exec "$@"
