import type { WsStatus } from '../state/types'

const STATUS_CONFIG: Record<WsStatus, { color: string; label: string }> = {
  connected: { color: 'bg-emerald-400', label: 'Live' },
  connecting: { color: 'bg-yellow-400 animate-pulse', label: 'Connecting…' },
  disconnected: { color: 'bg-gray-500', label: 'Offline' },
  error: { color: 'bg-red-500', label: 'Error' },
}

export function WsIndicator({ status }: { status: WsStatus }) {
  const { color, label } = STATUS_CONFIG[status]
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  )
}
