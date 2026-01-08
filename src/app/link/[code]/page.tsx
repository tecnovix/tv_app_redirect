import { notFound } from 'next/navigation'
import { getLinkByCode } from '@/lib/links'
import RedirectPage from '@/components/RedirectPage'

// Força renderização dinâmica
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function LinkPage({ params }: PageProps) {
  const { code } = await params
  const link = await getLinkByCode(code)

  if (!link) {
    notFound()
  }

  return <RedirectPage link={link} />
}
