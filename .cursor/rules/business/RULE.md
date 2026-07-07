# Regras de Negócio

Regras para o Cursor AI ao implementar lógica de negócio na Omnia Platform.

## Ecossistema

A plataforma serve 6 empresas: OFH, RR, NF, FDFA, CTE, CES.
Cada empresa pode ter regras específicas documentadas em docs/15-business-rules/.

## Módulos do MVP

Portal | Marketplace | CRM | Parceiro | Admin | Blog | CMS | Chat IA | AI Core | n8n

## Restrições

- Não implementar funcionalidades de negócio na Sprint 0
- Regras de negócio devem estar no domínio (packages/), não na UI
- Validações de domínio são independentes de framework
- Consulte docs/03-domain/ para modelagem de domínio

## Ao Implementar

1. Identifique o bounded context correto
2. Documente regras não óbvias em docs/15-business-rules/
3. Use linguagem ubíqua do domínio nos nomes
4. Testes unitários para toda regra de negócio
