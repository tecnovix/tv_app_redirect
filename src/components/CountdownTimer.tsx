'use client'

import { useState, useEffect, useCallback } from 'react'

interface CountdownTimerProps {
  seconds: number
  onComplete: () => void
  onTimeUpdate?: (remaining: number) => void
}

export default function CountdownTimer({ seconds, onComplete, onTimeUpdate }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(seconds)
  const [isPaused, setIsPaused] = useState(false)

  const handleComplete = useCallback(() => {
    onComplete()
  }, [onComplete])

  useEffect(() => {
    if (isPaused || remaining <= 0) return

    const timer = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1
        onTimeUpdate?.(next)

        if (next <= 0) {
          clearInterval(timer)
          handleComplete()
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isPaused, remaining, handleComplete, onTimeUpdate])

  // Pausa quando a aba perde foco (previne bypass por abrir outra aba)
  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const progress = ((seconds - remaining) / seconds) * 100

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Círculo de countdown */}
      <div className="relative" style={{ width: '80px', height: '80px' }}>
        <svg
          width="80"
          height="80"
          viewBox="0 0 100 100"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="transparent"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="transparent"
            stroke="#2563eb"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset={283 - (283 * progress) / 100}
          />
        </svg>
        {/* Number */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
            {remaining}
          </span>
        </div>
      </div>

      {/* Texto */}
      <p className="text-sm text-gray-500">
        {isPaused ? (
          <span className="text-yellow-600">Pausado - volte para esta aba</span>
        ) : remaining > 0 ? (
          `Redirecionando em ${remaining} segundo${remaining !== 1 ? 's' : ''}...`
        ) : (
          'Redirecionando...'
        )}
      </p>

      {/* Barra de progresso alternativa */}
      <div className="w-full max-w-xs h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
