import type { LogEntry } from '@shared/types'

const TYPE_STYLE: Record<LogEntry['type'], string> = {
  action: 'text-blue-400',
  challenge: 'text-orange-400',
  block: 'text-purple-400',
  result: 'text-gray-300',
  system: 'text-gray-500 italic',
}

const TYPE_ICON: Record<LogEntry['type'], string> = {
  action: '⚡',
  challenge: '⚔️',
  block: '🛡️',
  result: '💥',
  system: '•',
}

interface ActionLogProps {
  entries: LogEntry[]
}

export function ActionLog({ entries }: ActionLogProps) {
  const reversed = [...entries].reverse()

  return (
    <div className="flex flex-col border border-gray-700 rounded-lg bg-gray-900/50 overflow-hidden h-full">
      <div className="px-3 py-2 border-b border-gray-700 flex-shrink-0">
        <span className="text-xs uppercase tracking-widest text-gray-500">Action Log</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {reversed.map((entry) => (
          <div key={entry.id} className="flex gap-2 text-sm">
            <span className="flex-shrink-0 w-5 text-center">{TYPE_ICON[entry.type]}</span>
            <span className={TYPE_STYLE[entry.type]}>{entry.message}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-gray-600 text-xs italic text-center mt-4">Game log will appear here</p>
        )}
      </div>
    </div>
  )
}
