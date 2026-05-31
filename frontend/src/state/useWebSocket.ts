import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ClientMessage, ServerMessage } from '@shared/types'
import type { WsStatus } from './types'

export function useWebSocket(
  url: string | null,
  onMessage: (msg: ServerMessage) => void,
) {
  // null = no active connection; 'connected'/'error' = terminal state from callbacks
  const [activeStatus, setActiveStatus] = useState<'connected' | 'error' | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(onMessage)

  // Safe to update after render — not during render
  useLayoutEffect(() => {
    onMessageRef.current = onMessage
  })

  useEffect(() => {
    if (!url) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setActiveStatus('connected')
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as ServerMessage
        onMessageRef.current(msg)
      } catch { /* ignore malformed frames */ }
    }
    ws.onclose = () => {
      setActiveStatus(null)
      wsRef.current = null
    }
    ws.onerror = () => setActiveStatus('error')

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [url])

  // Derive full status — 'connecting' when url is set but not yet open
  const status: WsStatus = !url
    ? 'disconnected'
    : activeStatus === 'connected'
    ? 'connected'
    : activeStatus === 'error'
    ? 'error'
    : 'connecting'

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { status, send }
}
