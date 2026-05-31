import type { ClientPlayer, GamePhase } from '@shared/types'

interface PersonalHUDProps {
  player: ClientPlayer
  phase: GamePhase
  isMyTurn: boolean
}

function CardSlot({ card }: { card: ClientPlayer['cards'][number] }) {
  if (card.revealed) {
    return (
      <div className="flex flex-col items-center justify-center w-20 h-28 rounded-xl border-2 border-gray-700 bg-gray-800/50 opacity-40">
        <span className="text-xs text-gray-500 uppercase tracking-wide">{'name' in card ? card.name : '?'}</span>
        <span className="text-gray-600 text-xs mt-1">Lost</span>
      </div>
    )
  }
  if ('name' in card) {
    return (
      <div className="flex flex-col items-center justify-center w-20 h-28 rounded-xl border-2 border-amber-600 bg-amber-900/20 shadow-[0_0_12px_rgba(217,119,6,0.2)]">
        <span className="text-2xl">🃏</span>
        <span className="text-xs text-amber-400 font-semibold mt-1 uppercase tracking-wide">{card.name}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center w-20 h-28 rounded-xl border-2 border-gray-600 bg-gray-800/30">
      <span className="text-2xl opacity-40">🂠</span>
    </div>
  )
}

function statusLabel(phase: GamePhase, isMyTurn: boolean): { text: string; color: string } {
  if (!isMyTurn) return { text: 'Waiting', color: 'text-gray-500' }
  const map: Partial<Record<GamePhase, { text: string; color: string }>> = {
    waiting_for_action: { text: 'Your Turn', color: 'text-emerald-400' },
    waiting_for_reactions: { text: 'Awaiting Reactions', color: 'text-yellow-400' },
    waiting_for_block_challenge: { text: 'Block in Play', color: 'text-orange-400' },
    waiting_for_reveal: { text: 'Must Reveal a Card', color: 'text-red-400' },
    waiting_for_exchange: { text: 'Choose Cards', color: 'text-blue-400' },
    game_over: { text: 'Game Over', color: 'text-gray-500' },
  }
  return map[phase] ?? { text: 'Your Turn', color: 'text-emerald-400' }
}

export function PersonalHUD({ player, phase, isMyTurn }: PersonalHUDProps) {
  const status = statusLabel(phase, isMyTurn)

  return (
    <div className="border border-gray-700 rounded-xl bg-gray-900/60 px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-bold text-gray-100">
            {player.name}
            {player.isHost && <span className="ml-2 text-xs text-amber-500">HOST</span>}
          </p>
          <p className={`text-sm font-semibold ${status.color}`}>{status.text}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Coins</p>
          <p className="text-3xl font-black text-amber-400">{player.coins}</p>
        </div>
      </div>
      <div className="flex gap-3 justify-center">
        {player.cards.map((card, i) => (
          <CardSlot key={i} card={card} />
        ))}
      </div>
    </div>
  )
}
