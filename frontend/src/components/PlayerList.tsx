import type { LobbyPlayer } from '@shared/types'

interface PlayerListProps {
  players: LobbyPlayer[]
  myPlayerId: string
}

export function PlayerList({ players, myPlayerId }: PlayerListProps) {
  return (
    <ul className="space-y-2">
      {players.map((p) => (
        <li
          key={p.id}
          className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${
            p.isConnected
              ? 'border-gray-700 bg-gray-800/60'
              : 'border-gray-800 bg-gray-900/40 opacity-50'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              p.isConnected ? 'bg-emerald-400' : 'bg-gray-600'
            }`}
          />
          <span className="flex-1 text-gray-100 font-medium">
            {p.name}
            {p.id === myPlayerId && (
              <span className="ml-2 text-xs text-gray-500">(you)</span>
            )}
          </span>
          {p.isHost && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-900/60 text-amber-400 border border-amber-700">
              HOST
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
