# Referência de Deploy

## Fonte canônica

O procedimento executável de staging está em:

`docker/staging/DEPLOY.md`

Não duplicar nem improvisar a sequência aqui. Se comandos mudarem, atualizar
primeiro o runbook canônico e depois este resumo.

## Ambiente confirmado

| Serviço         | URL                                         |
| --------------- | ------------------------------------------- |
| Portal Web      | `https://dev.omniafrigo.com.br`             |
| Admin + Payload | `https://admin.dev.omniafrigo.com.br`       |
| Payload Admin   | `https://admin.dev.omniafrigo.com.br/admin` |

Containers runtime:

- `omnia-platform-web-dev`
- `omnia-platform-admin-dev`

Compose: `docker/compose/staging.yml`.

## Ordem obrigatória

1. Confirmar branch, working tree limpa, commit aprovado e backup.
2. Registrar `PREVIOUS_HEAD` e `DEPLOY_HEAD`.
3. Validar `.env.staging` e `docker compose config`.
4. Construir imagens runtime e one-off.
5. Executar `admin-migrate`.
6. Publicar o Admin e aguardar health.
7. Executar `admin-upgrade-holding-home`.
8. Executar `admin-seed-holding-institutional-pages`.
9. Publicar o Web e aguardar health.
10. Executar smoke tests e revisar logs.

## Resultados esperados

- Migration termina com exit code 0.
- Upgrade da Home: `created`, `upgraded` ou `skipped: already_current`.
- Seed institucional: cada slug `created` ou `skipped:slug_exists`.
- Admin e Web ficam `healthy`.
- `/`, `/sobre`, `/empresas` e `/contato` retornam 200.
- `/robots.txt` e `/sitemap.xml` respondem após deploy do SEO.

## Restrições

- Não executar seed geral neste deploy incremental.
- Não usar reset, force ou `payload migrate:down`.
- Não iniciar o Web novo antes de migration/Admin/conteúdo concluídos.
- Não declarar sucesso sem validar HTTP, conteúdo, SEO e logs.

## Rollback

- Aplicação: checkout do `PREVIOUS_HEAD`, rebuild de Admin/Web e `up -d`.
- Conteúdo: restaurar snapshot ou reverter manualmente pelo Payload.
- Banco: migrations atuais são aditivas; não executar rollback de batch.
- Procedimento detalhado: seção “Rollback manual” do runbook canônico.

## Estado operacional atual

As mudanças institucionais e de SEO estão locais e não commitadas. O próximo
deploy só pode ocorrer após commit aprovado e CI verde. O compose deve ser
validado na VPS, pois Docker não estava disponível na validação local mais recente.
