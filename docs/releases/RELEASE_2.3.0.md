# Release 2.3.0 — Partner Network (produção)

**Branch:** `release/2.3.0`  
**Commit de aplicação:** `d4c42ff` (homologado em DEV) + chore de wiring env produção  
**Ambiente:** produção (`omnia_platform_prod`)

## Escopo

Rede de Parceiros (cadastro público, aprovação, busca CEP/GPS/cidade, geocodificação, rate limit).

## Não inclui

- LMS, CRM novo, Neurofrigo IA
- Alteração de staging além do já homologado

## Rollback

1. Checkout do commit/imagem anterior (`68863ed` / containers pré-deploy)
2. Restore do dump em `/opt/omnia/backups/production/pre-*.dump`
3. Recreate `admin` + `web` com imagem anterior
