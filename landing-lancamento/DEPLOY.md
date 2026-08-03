# Deploy — Landing Pré-Lançamento v1.0

Publicação em **https://omniafrigo.com.br/lancamento**

## Pré-requisitos

- Node 22+ (ou imagem Docker abaixo)
- Proxy reverso (Traefik) no host `omniafrigo.com.br`
- **Não** remover o prefixo `/lancamento` na requisição (a app usa `basePath: '/lancamento'`)

## Build local

```bash
cd landing-lancamento
npm ci
npm run build
npm start
```

Smoke:

```bash
curl -fsS http://localhost:3000/lancamento | head
curl -fsS http://localhost:3000/lancamento/robots.txt
curl -fsS http://localhost:3000/lancamento/sitemap.xml
```

## Docker Compose (produção)

Na VPS, com a rede `omnia_proxy` já existente:

```bash
cd /opt/omnia/platform/landing-lancamento   # ou path do checkout
git fetch --tags
git checkout landing-v1.0
docker compose -f docker-compose.prod.yml up -d --build
```

Validar: `curl -fsSI https://omniafrigo.com.br/lancamento`

## Traefik (PathPrefix)

Router dedicado **acima** ou com prioridade maior que o portal genérico, apontando para este serviço:

```yaml
# Exemplo de labels (serviço separado — não altera LMS/portal code)
traefik.enable=true
traefik.docker.network=omnia_proxy
traefik.http.routers.omnia-landing-lancamento.rule=Host(`omniafrigo.com.br`) && PathPrefix(`/lancamento`)
traefik.http.routers.omnia-landing-lancamento.entrypoints=websecure
traefik.http.routers.omnia-landing-lancamento.tls=true
traefik.http.routers.omnia-landing-lancamento.tls.certresolver=letsencrypt
traefik.http.routers.omnia-landing-lancamento.priority=100
traefik.http.routers.omnia-landing-lancamento.service=omnia-landing-lancamento
traefik.http.services.omnia-landing-lancamento.loadbalancer.server.port=3000
```

**Importante:** não usar middleware `StripPrefix` — o Next espera o path completo `/lancamento/...`.

## Checklist pós-deploy

1. https://omniafrigo.com.br/lancamento carrega o Hero  
2. CTA abre o grupo WhatsApp oficial  
3. `/lancamento/robots.txt` e `/lancamento/sitemap.xml` respondem 200  
4. Favicon e logo visíveis  
5. OG: preview em ferramenta de compartilhamento  
6. Headers `X-Content-Type-Options`, `X-Frame-Options` presentes  

## Rodapé

| Link | Destino | Nota |
|------|---------|------|
| Política de Privacidade | https://omniafrigo.com.br/privacidade | Reservado — página portal futura |
| Termos de Uso | https://omniafrigo.com.br/termos | Reservado — página portal futura |
| Contato | https://omniafrigo.com.br/contato | Portal existente |

Links do rodapé não quebram a landing; páginas ainda inexistentes retornam 404 no portal até implementação futura.
