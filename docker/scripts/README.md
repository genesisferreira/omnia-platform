# Docker Scripts

Scripts auxiliares para operações Docker.

## Scripts

| Script               | Uso                                                      |
| -------------------- | -------------------------------------------------------- |
| `admin-bootstrap.sh` | Migrations Payload + seed em staging (container one-off) |

Invocado pelo target `bootstrap` em `apps/admin/Dockerfile` e pelos serviços `admin-bootstrap`, `admin-migrate`, `admin-seed` em `docker/compose/staging.yml`.

```bash
# Na VPS (a partir da raiz do repositório)
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-bootstrap
```

Modos: `migrate` | `seed` | `bootstrap` (padrão).
