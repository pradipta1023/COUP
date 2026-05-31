import type { ClientPlayer } from '@shared/types'

interface PlayerTableProps {
  players: ClientPlayer[]
  myPlayerId: string
  activePlayerId: string
}

function OtherPlayerCard({ player, isActive }: { player: ClientPlayer; isActive: boolean }) {
  const eliminated = player.isEliminated
  const unrevealed = player.cards.filter((c) => !c.revealed).length

  return (
    <div
      className={`relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
        eliminated
          ? 'border-gray-800 bg-gray-900/20 opacity-30 grayscale'
          : isActive
          ? 'border-amber-500 bg-amber-900/20 shadow-[0_0_20px_rgba(217,119,6,0.25)]'
          : 'border-gray-700 bg-gray-800/40'
      }`}
    >
      {isActive && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white">
          Turn
        </span>
      )}
      <p className={`text-sm font-semibold ${isActive ? 'text-amber-300' : 'text-gray-200'}`}>
        {player.name}
        {player.isHost && <span className="ml-1 text-amber-600">👑</span>}
      </p>
      <div className="flex gap-1">
        {player.cards.map((_, i) => (
          <span
            key={i}
            className={`text-lg ${
              player.cards[i].revealed ? 'opacity-20' : isActive ? 'drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]' : ''
            }`}
          >
            🂠
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <span className="text-amber-400 font-bold">{player.coins}</span>
        <span>coins</span>
        <span className="text-gray-600">·</span>
        <span>{unrevealed} card{unrevealed !== 1 ? 's' : ''}</span>
      </div>
      {!player.isConnected && !eliminated && (
        <span className="text-xs text-red-500">Disconnected</span>
      )}
    </div>
  )
}

export function PlayerTable({ players, myPlayerId, activePlayerId }: PlayerTableProps) {
  const others = players.filter((p) => p.id !== myPlayerId)

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {others.map((p) => (
        <OtherPlayerCard key={p.id} player={p} isActive={p.id === activePlayerId} />
      ))}
    </div>
  )
}
