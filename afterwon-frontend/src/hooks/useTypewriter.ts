import { useState, useEffect } from 'react'

interface TypewriterOptions {
  speed?: number
  delay?: number
  enabled?: boolean
}

export function useTypewriter(
  text: string,
  options: TypewriterOptions = {}
) {
  const {
    speed = 30, // ChatGPT 수준의 타이핑 속도 (ms per character)
    delay = 500, // 시작 전 지연
    enabled = true
  } = options

  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text)
      setIsTyping(false)
      return
    }

    if (!text) {
      setDisplayedText('')
      setIsTyping(false)
      return
    }

    setDisplayedText('')
    setIsTyping(true)

    const startTimeout = setTimeout(() => {
      let index = 0

      const typeInterval = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1))
          index++
        } else {
          clearInterval(typeInterval)
          setIsTyping(false)
        }
      }, speed)

      return () => clearInterval(typeInterval)
    }, delay)

    return () => {
      clearTimeout(startTimeout)
      setIsTyping(false)
    }
  }, [text, speed, delay, enabled])

  return {
    displayedText,
    isTyping
  }
}