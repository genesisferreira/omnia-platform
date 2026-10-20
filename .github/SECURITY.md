# Security Policy

## Versões Suportadas

| Versão  | Suportada |
| ------- | --------- |
| latest  | ✅        |
| < 0.1.0 | ❌        |

## Reportar Vulnerabilidades

Se você descobrir uma vulnerabilidade de segurança na Omnia Platform, **não abra uma issue pública**.

### Processo

1. Envie um e-mail para a equipe de engenharia da Omnia Frigo Holding
2. Inclua:
   - Descrição da vulnerabilidade
   - Passos para reproduzir
   - Impacto potencial
   - Sugestão de correção (se houver)
3. Aguarde confirmação em até **48 horas**
4. Trabalharemos em uma correção e comunicaremos quando estiver disponível

### O que NÃO fazer

- Não divulgue publicamente antes da correção
- Não explore a vulnerabilidade em produção
- Não acesse dados de outros usuários

## Práticas de Segurança

- Secrets nunca são commitados (use `.env`, nunca versionado)
- Dependências são auditadas regularmente
- OWASP Top 10 é referência para desenvolvimento
- Autenticação via JWT com rotação de secrets
- Princípio do menor privilégio em todas as camadas

## Auditoria de Dependências

```bash
# Sprint 1+ — quando dependências estiverem instaladas
pnpm audit
```

## Contato

Equipe de Engenharia — Omnia Frigo Holding
