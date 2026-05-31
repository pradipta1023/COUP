import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../state/types'
import type { ClientMessage } from '@shared/types'

interface ChatPanelProps {
  messages: ChatMessage[]
  onSend: (msg: ClientMessage) => void
  maxHeight?: string
}

export function ChatPanel({ messages, onSend, maxHeight = 'h-48' }: ChatPanelProps) {
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend({ type: 'chat', message: trimmed })
    setText('')
  }

  return (
    <div className="flex flex-col border border-gray-700 rounded-lg bg-gray-900/50 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-700">
        <span className="text-xs uppercase tracking-widest text-gray-500">Chat</span>
      </div>

      <div className={`${maxHeight} overflow-y-auto px-3 py-2 space-y-1 flex flex-col`}>
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs italic my-auto text-center">No messages yet</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="text-sm">
            <span className="font-semibold text-amber-400">{m.playerName}: </span>
            <span className="text-gray-300">{m.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-700 flex">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Type a message…"
          maxLength={500}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none"
        />
        <button
          onClick={submit}
          className="px-4 py-2 text-sm font-semibold text-amber-400 hover:text-amber-300 border-l border-gray-700 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
