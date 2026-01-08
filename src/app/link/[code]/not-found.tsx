import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="text-center p-8 animate-fade-in">
        <div className="text-6xl mb-6">🔗</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Link não encontrado</h1>
        <p className="text-gray-600 mb-8">
          Este link pode ter expirado ou não existe mais.
        </p>
        <Link
          href="https://tecnovix.com.br"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Ir para Tecnovix
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
