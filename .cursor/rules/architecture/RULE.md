# Regras de Arquitetura

Regras para o Cursor AI ao trabalhar na arquitetura da Omnia Platform.

## Princípios

- Monorepo modular com boundaries claros entre packages
- Clean Architecture: dependências apontam para dentro (domínio no centro)
- DDD: bounded contexts por módulo de negócio
- Repository Pattern para acesso a dados
- Service Layer para lógica de aplicação

## Restrições

- apps/ não importa diretamente de infraestrutura — use packages/
- packages/shared não depende de nenhum outro package
- packages/ui é agnóstico de negócio — apenas componentes visuais
- Toda decisão arquitetural significativa gera um ADR em docs/14-adr/

## Ao Implementar

1. Verifique ADRs existentes antes de propor mudanças
2. Mantenha baixo acoplamento entre packages
3. Use TypeScript strict em todo código
4. Prefira composição sobre herança
