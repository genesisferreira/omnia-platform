# Omnia LMS — Lesson Experience · Homologação DEV

> **Sprint 2.7 — Épico B**  
> Checklist para homologar em `dev.omniafrigo.com.br` (não tocar produção).

## Pré-requisitos

- [ ] Branch com Learning Engine (2.7A) + Lesson Experience (2.7B) deployada no DEV
- [ ] Produção intacta (compose/produção não alterado neste épico)
- [ ] Conta portal com Identity Link Moodle ativo

## Smoke manual

1. Login portal → `/lms`
2. Abrir curso → clicar aula
3. Verificar sidebar módulos + área principal + breadcrumb
4. Navegar **Aula anterior** / **Próxima aula** (SPA)
5. **Voltar ao curso** / **Ir para módulo** (`#modulo-*`)
6. Marcar **Concluída** → badge + Continue aponta próxima
7. Dashboard → Timeline mostra eventos da sessão
8. `/lms/continuar` retoma aula correta
9. Sem URLs `moodle.*` no HTML da página
10. Offline: banner; estados 403/bloqueada/erro cobertos

## Automação local (obrigatória antes do deploy)

```bash
pnpm --filter @omnia/web test:lms-lesson
pnpm --filter @omnia/web test:lms-continue
pnpm --filter @omnia/web test:lms-smoke
pnpm --filter @omnia/web typecheck
```

## Critério GO

Todos os itens do smoke + testes verdes + produção intacta.
