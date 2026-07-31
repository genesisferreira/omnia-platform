# Omnia LMS — Material Experience · Homologação DEV

> Checklist DEV (`dev.omniafrigo.com.br`). **Não tocar produção.**

## Automação

```bash
pnpm --filter @omnia/learning-engine test
pnpm --filter @omnia/web test:lms-material
pnpm --filter @omnia/web test:lms-lesson
pnpm --filter @omnia/web test:lms-smoke
pnpm --filter @omnia/web typecheck
```

## Smoke manual

1. Abrir aula com summary de módulo → ver material HTML + primary
2. Navegar **Próximo material** / **Material anterior**
3. Voltar aula / módulo / curso
4. Marcar material concluído → Timeline
5. PDF/vídeo mostram placeholder (sem CDN)
6. Sem URLs Moodle no DOM
