# Omnia LMS — Moodle 4.5 LTS engine (reproducible build)
# Base: moodlehq/moodle-php-apache:8.3 @ digest (see VERSIONS.md)
# Moodle core is downloaded ONLY at build time (never at runtime).

ARG PHP_BASE_DIGEST=sha256:946c42935f491ae3726cbee40a8de1209affb4926748a1da54764660ce3cfc5c
FROM moodlehq/moodle-php-apache:8.3@${PHP_BASE_DIGEST}

ARG MOODLE_REF=v4.5.12
ARG MOODLE_SHA256=4a280be626afaa2f4028a7b3ac1f52d47d56d72fc1951e22c8353758e3a96506

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp/moodle-src

RUN curl -fsSL "https://github.com/moodle/moodle/archive/refs/tags/${MOODLE_REF}.tar.gz" -o moodle.tgz \
  && echo "${MOODLE_SHA256}  moodle.tgz" | sha256sum -c - \
  && mkdir -p /var/www/html \
  && tar -xzf moodle.tgz --strip-components=1 -C /var/www/html \
  && rm -rf /tmp/moodle-src \
  && chown -R www-data:www-data /var/www/html \
  && find /var/www/html -type d -exec chmod 755 {} \; \
  && find /var/www/html -type f -exec chmod 644 {} \;

COPY configs/php/moodle.ini /usr/local/etc/php/conf.d/99-omnia-moodle.ini
COPY configs/apache/security.conf /etc/apache2/conf-available/omnia-security.conf
COPY configs/moodle/config.php.template /usr/local/share/omnia-lms/config.php.template
COPY scripts/entrypoint.sh /usr/local/bin/omnia-lms-entrypoint.sh
COPY scripts/cron-loop.sh /usr/local/bin/omnia-lms-cron-loop.sh
COPY scripts/health-cron.sh /usr/local/bin/omnia-lms-health-cron.sh

RUN a2enconf omnia-security \
  && chmod 755 /usr/local/bin/omnia-lms-entrypoint.sh \
    /usr/local/bin/omnia-lms-cron-loop.sh \
    /usr/local/bin/omnia-lms-health-cron.sh \
  && mkdir -p /var/www/moodledata /var/log/omnia-lms \
  && chown -R www-data:www-data /var/www/moodledata /var/log/omnia-lms

ENV MOODLE_DATAROOT=/var/www/moodledata \
    APACHE_DOCUMENT_ROOT=/var/www/html

WORKDIR /var/www/html

# Apache start requires root inside the container; compose sets no-new-privileges.
USER root

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=5 \
  CMD curl -fsS -o /dev/null http://127.0.0.1/login/index.php || exit 1

ENTRYPOINT ["/usr/local/bin/omnia-lms-entrypoint.sh"]
CMD ["apache2-foreground"]
