import { PrismaClient, RedirectType, LinkSource } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

// Gera hash da API key
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

async function main() {
  console.log('Seeding database...')

  // Configurações padrão
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      siteName: 'Tecnovix',
      siteUrl: 'https://tecnovix.com.br',
      defaultDelaySeconds: 5,
      defaultShowAds: true,
      defaultRedirectType: RedirectType.MONETIZED,
    },
  })
  console.log('Settings created')

  // API Keys para integração
  const apiKeys = [
    { name: 'tv_app_wp', key: 'tvwp_redirect_key_2024' },
    { name: 'tv_app_gestor', key: 'tvgestor_redirect_key_2024' },
    { name: 'tv_app_wpp', key: 'tvwpp_redirect_key_2024' },
  ]

  for (const apiKey of apiKeys) {
    await prisma.apiKey.upsert({
      where: { key: hashApiKey(apiKey.key) },
      update: {},
      create: {
        name: apiKey.name,
        key: hashApiKey(apiKey.key),
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
      },
    })
    console.log(`API Key created: ${apiKey.name}`)
  }

  // Links de exemplo
  const sampleLinks = [
    {
      code: 'creditas2025',
      targetUrl: 'https://www.sympla.com.br/evento/creditas-summit-2025',
      title: 'Creditas Summit 2025 - O Futuro das Fintechs',
      description: 'O maior evento de fintechs do Brasil. Networking, palestras e muito mais.',
      commentary: `O Creditas Summit 2025 promete ser um marco para o ecossistema de fintechs brasileiro. Com palestrantes de peso e cases reais de inovação, este é o evento que todo profissional de tecnologia financeira precisa participar.

A Tecnovix estará presente cobrindo as principais novidades e tendências. Não perca a oportunidade de fazer networking com os maiores players do mercado.`,
      source: LinkSource.EVENTO,
      sourceApp: 'tv_app_wp',
      sourceUrl: 'https://tecnovix.com.br/eventos/creditas-summit-2025-futuro-das-fintechs',
      redirectType: RedirectType.MONETIZED,
      delaySeconds: 7,
    },
    {
      code: 'notion-equipes',
      targetUrl: 'https://www.notion.so/templates/team-management',
      title: 'Template Notion - Gestão de Equipes Remotas',
      description: 'Template gratuito do Notion para gestão de equipes distribuídas.',
      commentary: `Este template do Notion é uma excelente ferramenta para quem está iniciando a gestão de equipes remotas. Ele oferece uma estrutura clara para acompanhamento de tarefas, reuniões e metas.

Recomendamos especialmente para startups e pequenas empresas que precisam de uma solução rápida e sem custos para organizar o trabalho remoto.`,
      source: LinkSource.BLOG,
      sourceApp: 'tv_app_wp',
      sourceUrl: 'https://tecnovix.com.br/negocios/gestao-de-equipes-remotas-melhores-praticas-para-2025',
      redirectType: RedirectType.MONETIZED,
      delaySeconds: 5,
    },
    {
      code: 'slack-download',
      targetUrl: 'https://slack.com/downloads',
      title: 'Download Slack - Comunicação para Equipes',
      description: 'Baixe o Slack gratuitamente para seu dispositivo.',
      commentary: `O Slack continua sendo uma das melhores ferramentas de comunicação para equipes remotas. Com integrações poderosas e canais organizados, facilita muito o dia a dia.

Dica da Tecnovix: use canais específicos por projeto e configure as notificações para não ser interrompido constantemente.`,
      source: LinkSource.BLOG,
      sourceApp: 'tv_app_wp',
      redirectType: RedirectType.COUNTDOWN,
      delaySeconds: 3,
    },
    {
      code: 'yt-gestao',
      targetUrl: 'https://www.youtube.com/watch?v=example',
      title: 'Vídeo: 5 Dicas de Gestão Remota',
      description: 'Nosso vídeo com as melhores práticas para gestão de equipes remotas.',
      source: LinkSource.YOUTUBE,
      sourceApp: 'tv_app_wp',
      redirectType: RedirectType.DIRECT,
      showAds: false,
      delaySeconds: 0,
    },
  ]

  for (const link of sampleLinks) {
    await prisma.redirectLink.upsert({
      where: { code: link.code },
      update: {},
      create: link,
    })
    console.log(`Link created: ${link.code}`)
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
