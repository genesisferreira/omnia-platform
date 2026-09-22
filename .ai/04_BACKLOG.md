# Backlog Operacional Confirmado

Este documento lista lacunas observadas no código/ambientes atuais. O backlog
estratégico completo permanece em `docs/00-product/BACKLOG_V2.md`. Itens locais
não commitados só mudam de status após merge/deploy comprovados.

## Prioridade imediata — fechar o Portal institucional

- [ ] Revisar e commitar as mudanças locais das Missões 01, 03 e G02.
- [ ] Executar CI completo no commit candidato.
- [ ] Publicar Admin e Web em staging conforme `docker/staging/DEPLOY.md`.
- [ ] Aplicar migration institucional pendente em staging.
- [ ] Executar `admin-upgrade-holding-home`.
- [ ] Executar `admin-seed-holding-institutional-pages`.
- [ ] Validar Home, Sobre, Empresas e Contato com HTTP 200.
- [ ] Validar Header/Footer, menu mobile, metadata, robots, sitemap e JSON-LD.
- [ ] Registrar HEAD implantado e resultado dos smoke tests.

## Portal/CMS ainda pendente

- [ ] Tornar Header, Footer e menus administráveis sem duplicar conteúdo.
- [ ] Implementar preview editorial seguro.
- [ ] Completar agendamento/auditoria editorial previstos, após especificação.
- [ ] Generalizar sitemap para todas as Pages publicadas sem expor dados internos.
- [ ] Resolver domínio canônico primário por Site, não apenas hostname solicitado.
- [ ] Implementar Open Graph image quando houver mídia editorial aprovada.
- [ ] Renderizar imagens públicas com `next/image` quando o layout autorizar.
- [ ] Revisar a experiência da página Contato quando canais reais forem aprovados.

## Dívidas técnicas conhecidas

- [ ] Corrigir o `down()` histórico da migration de Domains ou formalizar estratégia
      de rollback por migration/batch.
- [ ] Unificar diretórios de ADRs (`docs/14-adr` e `docs/07-adrs`) somente após decisão.
- [ ] Migrar `next lint` para ESLint CLI antes da remoção no Next.js 16.
- [ ] Atualizar documentos antigos que ainda marcam Pages/SEO/rotas como pendentes,
      preservando histórico e indicando o commit de entrega.
- [ ] Revalidar `PROJECT_CONTEXT.md`, cujo roadmap contém estados antigos.

## Fora do escopo atual

Não iniciar sem missão, especificação e autorização próprias:

- Autenticação/RBAC transacional e RLS.
- Blog/editorial avançado.
- CRM e captação de leads.
- Parceiros e geolocalização.
- LMS.
- Marketplace e pagamentos.
- Suporte/chat.
- IA operacional, RAG e automações.
- Analytics/BI.

Esses módulos estão planejados em produto, mas não devem ser tratados como
funcionalidades implementadas.
