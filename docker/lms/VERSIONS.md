# Omnia LMS — pinned versions

> Política: nunca usar `latest`. Preferir **tag + digest**. Atualizar este arquivo em cada bump.

## Moodle Core

| Campo | Valor |
| --- | --- |
| Versão | **4.5.12** (LTS) |
| Tag Git | `v4.5.12` |
| Origem | https://github.com/moodle/moodle |
| Tarball | `https://github.com/moodle/moodle/archive/refs/tags/v4.5.12.tar.gz` |
| SHA256 | `4a280be626afaa2f4028a7b3ac1f52d47d56d72fc1951e22c8353758e3a96506` |
| Security support | até **2027-10-04** |
| Próximo LTS | 5.3 (previsto 2026-10) |
| Download em runtime | **proibido** — apenas no build |

Checksum verificado no Dockerfile (`MOODLE_SHA256`). Atualizar ao mudar o patch.

## PHP / Apache (base)

| Campo | Valor |
| --- | --- |
| Imagem | `moodlehq/moodle-php-apache:8.3` |
| Digest (índice multi-arch) | `sha256:946c42935f491ae3726cbee40a8de1209affb4926748a1da54764660ce3cfc5c` |
| Digest amd64 | `sha256:5c50aea250deef3957ec07b7b122bd9b13fc924f1b02b041f1bfa30a490d0e5c` |
| PHP | 8.3.x (suportado por Moodle 4.5) |
| Origem | https://hub.docker.com/r/moodlehq/moodle-php-apache |

## MariaDB

| Campo | Valor |
| --- | --- |
| Imagem | `mariadb:11.4` |
| Digest (DEV) | `mariadb@sha256:a794d9eb009e20de605858a11f32f63b4075cbd197c650436f0e3b457e4caed7` |
| Charset | `utf8mb4` |
| Collation | `utf8mb4_unicode_ci` |

## Redis

| Campo | Valor |
| --- | --- |
| Imagem | `redis:7.4-alpine` |
| Digest (DEV) | `redis@sha256:e7723ff73d963f5cc6d9c4643ea3d989527a402a319239054e9472a7fb9219a2` |
| Uso | sessões + application cache Moodle |
| Nota | `protected-mode no` — porta não publicada; só rede interna LMS |

## Política de atualização

1. Ler release notes Moodle 4.5.x / MariaDB / Redis.
2. Atualizar tag + SHA256 / digest neste arquivo e nos compose/Dockerfile.
3. Build em DEV → validar checklist → só então PROD.
4. Nunca `docker compose pull` cego sem revisar digests.
5. Rollback = retag da imagem anterior + volumes intactos (ver docs de rollback).

## Compatibilidade futura

Stack dimensionada para: UI Omnia LMS (`lms.*`), Web Services, multiempresa, milhares de alunos — **sem** modificar o core. Integrações via APIs/WS/connector (Sprint 2.4.3).
