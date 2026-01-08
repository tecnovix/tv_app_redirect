'use client'

import { useState } from 'react'

interface RedirectButtonProps {
  targetUrl: string
  onClick?: () => void
  disabled?: boolean
}

export default function RedirectButton({ targetUrl, onClick, disabled }: RedirectButtonProps) {
  const [isClicked, setIsClicked] = useState(false)

  const handleClick = () => {
    if (disabled || isClicked) return

    setIsClicked(true)
    onClick?.()

    // Pequeno delay para garantir que o tracking foi enviado
    setTimeout(() => {
      window.location.href = targetUrl
    }, 100)
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isClicked}
      className={`
        w-full max-w-md px-8 py-4 rounded-xl font-semibold text-lg
        transition-all duration-200 transform
        ${
          isClicked
            ? 'bg-green-500 text-white cursor-wait'
            : disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
        }
      `}
    >
      {isClicked ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Redirecionando...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          Ir para o conteúdo
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </span>
      )}
    </button>
  )
}
