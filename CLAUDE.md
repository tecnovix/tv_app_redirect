# TV_APP_REDIRECT - Sistema de Links de Referência

> Sistema de redirecionamento inteligente com monetização e SEO

## Visão Geral

O **tv_app_redirect** é o sistema de links de referência da Tecnovix que:

- **Preserva Autoridade SEO**: Não cede link juice para sites externos diretamente
- **Monetiza Tráfego de Saída**: Exibe AdSense antes do redirecionamento
- **Agrega Valor**: Mostra análise/comentário original sobre o conteúdo externo
- **Rastreia Cliques**: Analytics de todos os links de saída

## Fluxo do Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE REDIRECIONAMENTO                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. ORIGEM                        2. PÁGINA INTERMEDIÁRIA           │
│  ┌─────────────────┐              ┌─────────────────────────────┐  │
│  │ Artigo Tecnovix │              │ redirect.tecnovix.app/link/ │  │
│  │ "Ler fonte      │ ──────────▶  │                             │  │
│  │  original"      │              │ ┌─────────────────────────┐ │  │
│  └─────────────────┘              │ │ Comentário Tecnovix     │ │  │
│                                   │ │ sobre este conteúdo     │ │  │
│                                   │ │                         │ │  │
│                                   │ │ [2 parágrafos análise]  │ │  │
│                                   │ │                         │ │  │
│                                   │ │ ┌───────────────────┐   │ │  │
│                                   │ │ │   ADSENSE BANNER  │   │ │  │
│                                   │ │ └───────────────────┘   │ │  │
│                                   │ │                         │ │  │
│                                   │ │ [Ir para conteúdo]      │ │  │
│                                   │ │ Redirecionando em 5s... │ │  │
│                                   │ └─────────────────────────┘ │  │
│                                   └──────────────┬──────────────┘  │
│                                                  │                  │
│  3. DESTINO EXTERNO                              ▼                  │
│  ┌─────────────────┐              ┌─────────────────────────────┐  │
│  │ Site Externo    │ ◀────────── │ Redirect após 5-7 segundos  │  │
│  │ (fonte original)│              │ ou clique no botão          │  │
│  └─────────────────┘              └─────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Domínios

| Ambiente | URL |
|----------|-----|
| Produção | https://redirect.tecnovix.app |
| Desenvolvimento | http://redirect.localhost |

## Estrutura de URL

```
redirect.tecnovix.app/link/{encoded-url}
redirect.tecnovix.app/link/{short-code}

Exemplos:
redirect.tecnovix.app/link/aHR0cHM6Ly9leGFtcGxlLmNvbQ==
redirect.tecnovix.app/link/abc123
```

## Stack Técnica

| Componente | Tecnologia | Descrição |
|------------|-----------|-----------|
| Frontend | Next.js 14 | App Router + Server Components |
| Backend | API Routes | Endpoints internos |
| Banco | PostgreSQL (tv_data_postgres) | Database: `tv_redirect_db` |
| Cache | Redis (tv_data_redis) | Database: 12 |
| Analytics | PostHog / interno | Rastreamento de cliques |
| Ads | Google AdSense | Monetização |

## Portas

| Serviço | Porta Dev | Porta Prod |
|---------|-----------|------------|
| Frontend | 3950 | 3000 |
| API | 4950 | - |

## Estrutura do Projeto

```
tv_app_redirect/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing (opcional)
│   │   └── link/
│   │       └── [code]/
│   │           └── page.tsx      # Página de redirecionamento
│   ├── components/
│   │   ├── RedirectPage.tsx      # Componente principal
│   │   ├── CommentarySection.tsx # Análise do conteúdo
│   │   ├── AdBanner.tsx          # Banner AdSense
│   │   ├── RedirectButton.tsx    # Botão de redirecionamento
│   │   └── CountdownTimer.tsx    # Timer de 5-7 segundos
│   └── lib/
│       ├── links.ts              # Gerenciamento de links
│       ├── analytics.ts          # Rastreamento
│       └── ai.ts                 # Geração de comentários (IA)
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── Dockerfile
└── CLAUDE.md
```

## Modelo de Dados

```prisma
model RedirectLink {
  id          String   @id @default(uuid())
  code        String   @unique           // Short code (abc123)
  targetUrl   String                     // URL de destino
  title       String?                    // Título do conteúdo externo
  commentary  String?  @db.Text          // Análise/comentário (2 parágrafos)
  sourceApp   String?                    // App de origem (tv_app_wp, tv_app_gestor)
  sourceUrl   String?                    // URL de origem
  clicks      Int      @default(0)       // Contador de cliques
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([code])
  @@index([targetUrl])
}

model ClickEvent {
  id          String   @id @default(uuid())
  linkId      String
  link        RedirectLink @relation(fields: [linkId], references: [id])
  ip          String?
  userAgent   String?
  referer     String?
  country     String?
  clickedAt   DateTime @default(now())

  @@index([linkId])
  @@index([clickedAt])
}
```

## Funcionalidades

### 1. Criação de Links
- API para criar links de redirecionamento
- Geração automática de short codes
- Suporte a URL encoded ou short code

### 2. Página de Transição
- Título: "Comentário Tecnovix sobre este conteúdo externo"
- 2 parágrafos de análise/insight (gerados por IA ou manual)
- Banner AdSense discreto (lateral ou abaixo)
- Botão grande: "Ir para o conteúdo original"
- Countdown: Redirecionamento automático após 5-7 segundos

### 3. Analytics
- Contagem de cliques por link
- Origem do tráfego (referer)
- Geolocalização
- User agent

### 4. Integração com Outros Apps
- tv_app_wp: Links de "Ler fonte original"
- tv_app_gestor: Links de "Ver conteúdo de referência"
- Qualquer app pode criar links via API

## API Endpoints

```typescript
// Criar novo link
POST /api/links
{
  "targetUrl": "https://example.com/article",
  "title": "Título do artigo",
  "commentary": "Análise opcional...",
  "sourceApp": "tv_app_wp",
  "sourceUrl": "https://tecnovix.com.br/post/xyz"
}

// Buscar link
GET /api/links/:code

// Analytics
GET /api/links/:code/stats
```

## Configuração AdSense

```tsx
// components/AdBanner.tsx
<ins
  className="adsbygoogle"
  style={{ display: 'block' }}
  data-ad-client="ca-pub-XXXXXXXX"
  data-ad-slot="YYYYYYYY"
  data-ad-format="auto"
/>
```

## SEO

- Meta robots: `noindex, nofollow` (página de transição)
- Link externo: `rel="nofollow noopener noreferrer"`
- Canonical: Não definido (página temporária)

## Variáveis de Ambiente

```env
# Database
DATABASE_URL=postgresql://tv_redirect_user:password@tv-postgres:5432/tv_redirect_db

# Redis
REDIS_URL=redis://tv-redis:6379/12

# AdSense
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXX
NEXT_PUBLIC_ADSENSE_SLOT=YYYYYYYY

# Config
REDIRECT_DELAY_SECONDS=5
NEXT_PUBLIC_SITE_URL=https://redirect.tecnovix.app

# API Key (para criar links de outros apps)
API_KEY=your-api-key-here
```

## Docker

```yaml
services:
  app:
    build: .
    container_name: tv-redirect-app
    ports:
      - "3950:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    networks:
      - tv-redirect-network
      - tv-postgres-network
      - tv-redis-network
      - tv-traefik-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.redirect.rule=Host(`redirect.tecnovix.app`)"
      - "traefik.http.routers.redirect.tls.certresolver=letsencrypt"

networks:
  tv-redirect-network:
    driver: bridge
  tv-postgres-network:
    external: true
  tv-redis-network:
    external: true
  tv-traefik-network:
    external: true
```

## Integração com Apps

### Uso no tv_app_wp (WordPress)
```php
// Em artigos, ao invés de link direto:
// <a href="https://fonte-externa.com">Ler fonte</a>

// Usar:
// <a href="https://redirect.tecnovix.app/link/abc123">Ler fonte original</a>
```

### Uso no tv_app_gestor
```typescript
// Ao citar fontes externas
const redirectUrl = await createRedirectLink({
  targetUrl: 'https://fonte-externa.com/artigo',
  title: 'Artigo sobre XYZ',
  sourceApp: 'tv_app_gestor'
});
// Retorna: https://redirect.tecnovix.app/link/abc123
```

## Benefícios

| Benefício | Descrição |
|-----------|-----------|
| **SEO** | Preserva autoridade do domínio, não cede link juice |
| **Monetização** | Gera receita com AdSense em tráfego de saída |
| **Analytics** | Rastreia todos os cliques para fontes externas |
| **Valor** | Agrega análise original antes do redirecionamento |
| **Controle** | Pode desativar links quebrados ou problemáticos |

## Repositório

- **GitHub**: [tv_app_redirect](https://github.com/tecnovix/tv_app_redirect)
- **Tópico**: tv-web
