# TV_APP_REDIRECT

Sistema de links de referência da Tecnovix com monetização e preservação de autoridade SEO.

## Funcionalidades

- Página intermediária com comentário original
- Monetização via AdSense
- Redirecionamento automático (5-7 segundos)
- Analytics de cliques
- API para integração com outros apps

## Quick Start

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Rodar migrations
npx prisma migrate dev

# Iniciar desenvolvimento
npm run dev
```

## Stack

- Next.js 14
- PostgreSQL (tv_data_postgres)
- Redis (tv_data_redis)
- Google AdSense

## Domínio

- Produção: https://redirect.tecnovix.app
- Desenvolvimento: http://redirect.localhost

## Documentação

Ver [CLAUDE.md](./CLAUDE.md) para documentação completa.
