import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tecnovix Redirect',
  description: 'Sistema de links de referência Tecnovix',
  robots: 'noindex, nofollow',
}

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="text-center p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Tecnovix Redirect</h1>
        <p className="text-gray-600">Sistema de links de referência</p>
        <p className="text-sm text-gray-400 mt-8">
          <a href="https://tecnovix.com.br" className="hover:text-blue-600">
            tecnovix.com.br
          </a>
        </p>
      </div>
    </main>
  )
}
