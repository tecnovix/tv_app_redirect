'use client'

import { useEffect, useRef } from 'react'

interface AdBannerProps {
  slot?: string
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle'
  className?: string
}

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

export default function AdBanner({ slot, format = 'auto', className = '' }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)
  const isLoaded = useRef(false)

  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  const adsenseSlot = slot || process.env.NEXT_PUBLIC_ADSENSE_SLOT

  useEffect(() => {
    if (!adsenseClient || !adsenseSlot || isLoaded.current) return

    try {
      if (typeof window !== 'undefined' && adRef.current) {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        isLoaded.current = true
      }
    } catch (error) {
      console.error('AdSense error:', error)
    }
  }, [adsenseClient, adsenseSlot])

  // Não renderiza se não houver configuração
  if (!adsenseClient || !adsenseSlot) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 text-center text-gray-400 text-sm ${className}`}>
        Espaço publicitário
      </div>
    )
  }

  return (
    <div className={className}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adsenseClient}
        data-ad-slot={adsenseSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
