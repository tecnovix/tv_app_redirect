# TV_APP_REDIRECT

Sistema de links de referência da Tecnovix com monetização e preservação de autoridade SEO.

## Funcionalidades

- Redirecionamento inteligente com 3 modos: DIRECT, COUNTDOWN, MONETIZED
- Página intermediária com comentário/análise Tecnovix
- Monetização via Google AdSense
- Countdown visual antes do redirecionamento
- Analytics de cliques completo
- API REST para integração com WordPress e outros apps
- Rate limiting e proteções de segurança

## Quick Start

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Gerar cliente Prisma
npx prisma generate

# Rodar migrations
npx prisma db push

# Seed (dados iniciais + API keys)
npm run db:seed

# Iniciar desenvolvimento
npm run dev
```

## Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL 16 (tv_data_postgres)
- **Cache:** Redis 7 (tv_data_redis)
- **ORM:** Prisma
- **Monetização:** Google AdSense

## Portas

| Ambiente | Porta |
|----------|-------|
| Dev | 3950 |
| Prod | 3000 (container) |

## Domínios

| Ambiente | URL |
|----------|-----|
| Produção | https://redirect.tecnovix.app |
| Dev (Traefik) | http://redirect.localhost |
| Dev (direto) | http://localhost:3950 |

## API

### Autenticação
Todas as chamadas requerem header `x-api-key`.

API Keys padrão (geradas no seed):
- `tvwp_redirect_key_2024` - WordPress
- `tvgestor_redirect_key_2024` - Gestor
- `tvwpp_redirect_key_2024` - WhatsApp Bot

### Endpoints

```bash
# Criar link
POST /api/links
{
  "targetUrl": "https://exemplo.com/artigo",
  "code": "meu-link",           # opcional
  "title": "Título",            # opcional
  "description": "Descrição",   # opcional
  "commentary": "Análise...",   # opcional
  "redirectType": "MONETIZED",  # DIRECT | COUNTDOWN | MONETIZED
  "delaySeconds": 5,            # opcional
  "showAds": true,              # opcional
  "source": "BLOG"              # BLOG | YOUTUBE | EVENTO | etc
}

# Listar links
GET /api/links?page=1&limit=20&source=BLOG

# Buscar link
GET /api/links/{code}

# Estatísticas
GET /api/links/{code}/stats

# Atualizar
PATCH /api/links/{code}

# Desativar
DELETE /api/links/{code}
```

### Exemplo de uso (PHP/WordPress)

```php
$response = wp_remote_post('https://redirect.tecnovix.app/api/links', [
    'headers' => [
        'Content-Type' => 'application/json',
        'x-api-key' => 'tvwp_redirect_key_2024'
    ],
    'body' => json_encode([
        'targetUrl' => 'https://sympla.com.br/evento/...',
        'title' => 'Creditas Summit 2025',
        'source' => 'EVENTO',
        'sourceUrl' => get_permalink()
    ])
]);

$data = json_decode(wp_remote_retrieve_body($response), true);
$shortUrl = $data['data']['shortUrl'];
// https://redirect.tecnovix.app/link/abc123
```

## Docker

```bash
# Desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# Produção
docker-compose up -d
```

## Estrutura de Arquivos

```
tv_app_redirect/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── links/          # CRUD de links
│   │   │   ├── analytics/      # Tracking
│   │   │   └── health/         # Health check
│   │   ├── link/[code]/        # Página de redirect
│   │   └── page.tsx            # Landing
│   ├── components/
│   │   ├── AdBanner.tsx
│   │   ├── CountdownTimer.tsx
│   │   ├── RedirectButton.tsx
│   │   └── RedirectPage.tsx
│   └── lib/
│       ├── prisma.ts
│       ├── redis.ts
│       ├── links.ts
│       ├── analytics.ts
│       └── security.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── docker-compose.yml
└── Dockerfile
```

## Documentação Completa

Ver [CLAUDE.md](./CLAUDE.md) para documentação detalhada.
