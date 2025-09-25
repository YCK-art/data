'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface WebSocketMessage {
  type: string
  message: string
  progress?: number
}

interface UseWebSocketReturn {
  isConnected: boolean
  sendMessage: (message: any) => void
  lastMessage: WebSocketMessage | null
  connectionError: string | null
  connect: () => void
}

export function useWebSocket(autoConnect: boolean = false): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const websocketRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    // Don't try to connect if already connected
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8000'
      const ws = new WebSocket(`${wsUrl}/ws/analysis`)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionError(null)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        websocketRef.current = null
      }

      ws.onerror = (error) => {
        console.warn('WebSocket connection failed - continuing without real-time updates')
        setConnectionError(null) // Don't show error to user
        setIsConnected(false)
      }

      websocketRef.current = ws
    } catch (error) {
      console.warn('Failed to create WebSocket connection - continuing without real-time updates')
      setConnectionError(null) // Don't show error to user
    }
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [])

  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close()
      }
    }
  }, [connect, autoConnect])

  // Return connect function so it can be called manually
  return {
    isConnected,
    sendMessage,
    lastMessage,
    connectionError,
    connect
  }
}