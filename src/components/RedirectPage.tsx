'use client'

import { useState, useEffect, useRef } from 'react'

interface RedirectLink {
  id: string
  code: string
  targetUrl: string
  title: string | null
  description: string | null
  commentary: string | null
  imageUrl: string | null
  redirectType: 'DIRECT' | 'MONETIZED' | 'COUNTDOWN'
  delaySeconds: number
  showAds: boolean
}

interface RedirectPageProps {
  link: RedirectLink
}

// Tecnovix brand colors
const colors = {
  purpleDark: '#1a0033',
  purple: '#2d1b4e',
  purpleLight: '#8b5cf6',
  gold: '#FFD700',
  goldLight: '#FFE44D',
}

export default function RedirectPage({ link }: RedirectPageProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [remaining, setRemaining] = useState(link.delaySeconds)
  const [hasRedirected, setHasRedirected] = useState(false)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    if (link.redirectType === 'DIRECT') {
      window.location.href = link.targetUrl
    }
  }, [isMounted, link.redirectType, link.targetUrl])

  useEffect(() => {
    if (!isMounted) return
    if (link.redirectType === 'DIRECT' || hasRedirected) return

    startTimeRef.current = Date.now()

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isMounted, link.redirectType, hasRedirected])

  useEffect(() => {
    if (!isMounted) return
    if (remaining === 0 && !hasRedirected) {
      setHasRedirected(true)
      trackAndRedirect(true)
    }
  }, [isMounted, remaining, hasRedirected])

  const trackAndRedirect = async (waitedFull: boolean) => {
    const timeOnPage = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0

    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkCode: link.code,
          waitedFull,
          clickedButton: !waitedFull,
          timeOnPage,
        }),
      })
    } catch {
      // Ignore
    }

    window.location.href = link.targetUrl
  }

  const handleButtonClick = () => {
    if (hasRedirected) return
    setHasRedirected(true)
    trackAndRedirect(false)
  }

  if (!isMounted) {
    return null
  }

  const progress = ((link.delaySeconds - remaining) / link.delaySeconds) * 100

  const targetDomain = (() => {
    try {
      return new URL(link.targetUrl).hostname
    } catch {
      return link.targetUrl
    }
  })()

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(180deg, ${colors.purpleDark} 0%, ${colors.purple} 100%)` }}
    >
      {/* Header */}
      <header style={{ backgroundColor: colors.purpleDark, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Top bar */}
        <div style={{ backgroundColor: colors.purple }} className="py-2">
          <div className="max-w-4xl mx-auto px-4">
            <p className="text-center text-xs font-medium uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Conteúdo Recomendado por Tecnovix
            </p>
          </div>
        </div>
        {/* Main header */}
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="https://tecnovix.com.br" className="flex items-center gap-3">
            <img
              src="/logo-tecnovix-white.webp"
              alt="Tecnovix"
              className="h-8 w-auto"
            />
          </a>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <svg className="w-4 h-4" style={{ color: '#22c55e' }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Link Seguro</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(45, 27, 78, 0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {/* Title section */}
            {link.title && (
              <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h1 className="text-xl md:text-2xl font-bold text-white text-center">
                  {link.title}
                </h1>
                {link.description && (
                  <p className="mt-2 text-center text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {link.description}
                  </p>
                )}
              </div>
            )}

            {/* Commentary */}
            {link.commentary && link.showAds && (
              <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4" style={{ color: colors.gold }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.gold }}>
                    Nota da Tecnovix
                  </span>
                </div>
                <div className="space-y-3">
                  {link.commentary.split('\n\n').map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Ad placeholder */}
            {link.showAds && (
              <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div
                  className="rounded-lg p-4 text-center text-xs"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
                >
                  Espaço publicitário
                </div>
              </div>
            )}

            {/* Countdown & Action */}
            <div className="px-6 py-8">
              <div className="flex flex-col items-center gap-6">
                {/* Circular countdown */}
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={colors.gold}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="264"
                      strokeDashoffset={264 - (264 * progress) / 100}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{remaining}</span>
                  </div>
                </div>

                {/* Status text */}
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {remaining > 0
                    ? `Redirecionando em ${remaining} segundo${remaining !== 1 ? 's' : ''}...`
                    : 'Redirecionando...'}
                </p>

                {/* Progress bar */}
                <div className="w-full max-w-xs h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <div
                    className="h-full"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: colors.gold,
                      transition: 'width 1s linear'
                    }}
                  />
                </div>

                {/* CTA Button */}
                <button
                  onClick={handleButtonClick}
                  disabled={hasRedirected}
                  className="w-full max-w-sm px-8 py-4 rounded-xl font-bold text-base transition-all duration-200"
                  style={{
                    backgroundColor: hasRedirected ? '#22c55e' : colors.gold,
                    color: hasRedirected ? 'white' : colors.purpleDark,
                    cursor: hasRedirected ? 'wait' : 'pointer',
                    boxShadow: hasRedirected ? 'none' : '0 4px 20px rgba(255, 215, 0, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!hasRedirected) {
                      e.currentTarget.style.backgroundColor = colors.goldLight
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!hasRedirected) {
                      e.currentTarget.style.backgroundColor = colors.gold
                    }
                  }}
                >
                  {hasRedirected ? 'Redirecionando...' : 'Ir para o conteúdo →'}
                </button>

                {/* Target URL */}
                <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>{targetDomain}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: colors.purpleDark, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left side - Logo & Copyright */}
            <div className="flex items-center gap-4">
              <a href="https://tecnovix.com.br" className="flex items-center gap-2">
                <img
                  src="/logo-tecnovix-white.webp"
                  alt="Tecnovix"
                  className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity"
                />
              </a>
              <span style={{ color: 'rgba(255,255,255,0.3)' }} className="hidden md:inline">|</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                © {new Date().getFullYear()} Tecnovix
              </span>
            </div>

            {/* Center - Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/tecnovix"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)' }}
                aria-label="Instagram"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.gold
                  e.currentTarget.style.color = colors.gold
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com/company/tecnovix"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)' }}
                aria-label="LinkedIn"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.gold
                  e.currentTarget.style.color = colors.gold
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>

            {/* Right side - Links */}
            <div className="flex items-center gap-4 text-xs">
              <a
                href="https://tecnovix.com.br/politica-de-privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.gold}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              >
                Privacidade
              </a>
              <a
                href="https://tecnovix.com.br/termos-de-uso"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.gold}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              >
                Termos
              </a>
              <a
                href="https://tecnovix.com.br/contato"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.gold}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              >
                Contato
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
