import { useState } from 'react'
import type { BlockRole, ClientGameState, ClientMessage } from '@shared/types'

const BLOCK_ROLES_FOR_ACTION: Partial<Record<string, BlockRole[]>> = {
  foreign_aid: ['Duke'],
  assassinate: ['Contessa'],
  steal: ['Captain', 'Ambassador'],
}

interface ReactionModalProps {
  gameState: ClientGameState
  myPlayerId: string
  onSend: (msg: ClientMessage) => void
}

export function ReactionModal({ gameState, myPlayerId, onSend }: ReactionModalProps) {
  const { turnState } = gameState
  const { phase } = turnState

  const isBlockPhase = phase === 'waiting_for_block_challenge'
  const isReactionPhase = phase === 'waiting_for_reactions'
  const isMyTurn = turnState.currentPlayerId === myPlayerId
  const alreadyPassed = turnState.passedPlayerIds.includes(myPlayerId)
  const isBlocker = turnState.blockingPlayerId === myPlayerId

  if (phase === 'waiting_for_exchange' && isMyTurn) {
    return <ExchangeChooser cards={turnState.exchangeCards ?? []} onSend={onSend} />
  }

  if (phase === 'waiting_for_reveal' && turnState.revealingPlayerId === myPlayerId) {
    const me = gameState.players.find((p) => p.id === myPlayerId)!
    const unrevealedIndices = me.cards
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => !c.revealed)
      .map(({ i }) => i)

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-gray-900 border border-red-800 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
          <h3 className="text-lg font-bold text-red-400 text-center">Reveal a Card</h3>
          <p className="text-gray-400 text-sm text-center">You must lose one influence.</p>
          <div className="flex gap-3 justify-center">
            {unrevealedIndices.map((idx) => {
              const card = me.cards[idx]
              return (
                <button
                  key={idx}
                  onClick={() => onSend({ type: 'reveal_card', cardIndex: idx })}
                  className="flex flex-col items-center px-5 py-4 rounded-xl border-2 border-red-700 bg-red-900/20 hover:border-red-500 hover:bg-red-900/40 transition-colors"
                >
                  <span className="text-2xl">🃏</span>
                  <span className="text-sm font-bold text-red-300 mt-1">
                    {'name' in card ? card.name : '?'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (!isReactionPhase && !isBlockPhase) return null
  if (isMyTurn && isReactionPhase) return null
  if (isBlocker && isBlockPhase) return null
  if (alreadyPassed) return null

  const blockableRoles = isReactionPhase
    ? BLOCK_ROLES_FOR_ACTION[turnState.pendingAction ?? ''] ?? []
    : []

  const canBlock = blockableRoles.length > 0 && !isMyTurn
  const actor = gameState.players.find((p) => p.id === turnState.currentPlayerId)
  const blocker = gameState.players.find((p) => p.id === turnState.blockingPlayerId)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
        {isReactionPhase && (
          <div className="text-center space-y-1">
            <p className="text-lg font-bold text-gray-100">
              {actor?.name} claims{' '}
              {turnState.claimedRole && (
                <span className="text-amber-400">{turnState.claimedRole}</span>
              )}{' '}
              to <span className="text-blue-400">{turnState.pendingAction?.replace('_', ' ')}</span>
            </p>
            {turnState.targetPlayerId && (
              <p className="text-sm text-gray-400">
                targeting{' '}
                <span className="text-gray-200">
                  {gameState.players.find((p) => p.id === turnState.targetPlayerId)?.name}
                </span>
              </p>
            )}
          </div>
        )}

        {isBlockPhase && (
          <div className="text-center">
            <p className="text-lg font-bold text-gray-100">
              <span className="text-purple-400">{blocker?.name}</span> claims{' '}
              <span className="text-amber-400">{turnState.blockingRole}</span> to block
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {isReactionPhase && turnState.claimedRole && (
            <button
              onClick={() => onSend({ type: 'challenge' })}
              className="w-full py-2.5 rounded-xl border border-orange-700 bg-orange-900/20 hover:bg-orange-900/40 text-orange-300 font-semibold transition-colors"
            >
              ⚔️ Challenge
            </button>
          )}

          {canBlock && blockableRoles.map((role) => (
            <button
              key={role}
              onClick={() => onSend({ type: 'block', role })}
              className="w-full py-2.5 rounded-xl border border-purple-700 bg-purple-900/20 hover:bg-purple-900/40 text-purple-300 font-semibold transition-colors"
            >
              🛡️ Block as {role}
            </button>
          ))}

          {isBlockPhase && !isMyTurn && (
            <button
              onClick={() => onSend({ type: 'challenge' })}
              className="w-full py-2.5 rounded-xl border border-orange-700 bg-orange-900/20 hover:bg-orange-900/40 text-orange-300 font-semibold transition-colors"
            >
              ⚔️ Challenge the Block
            </button>
          )}

          <button
            onClick={() => onSend({ type: 'pass' })}
            className="w-full py-2.5 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-400 font-semibold transition-colors"
          >
            Pass
          </button>
        </div>
      </div>
    </div>
  )
}

function ExchangeChooser({ cards, onSend }: { cards: string[]; onSend: (msg: ClientMessage) => void }) {
  const [selected, setSelected] = useState<number[]>([])

  const toggle = (i: number) => {
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : prev.length < 2 ? [...prev, i] : prev,
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-blue-800 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 className="text-lg font-bold text-blue-400 text-center">Ambassador Exchange</h3>
        <p className="text-gray-400 text-sm text-center">Choose 2 cards to keep.</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {cards.map((name, i) => {
            const isSelected = selected.includes(i)
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`flex flex-col items-center px-4 py-3 rounded-xl border-2 transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-900/30 text-blue-200'
                    : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                }`}
              >
                <span className="text-xl">🃏</span>
                <span className="text-xs font-bold mt-1">{name}</span>
              </button>
            )
          })}
        </div>
        <button
          onClick={() => {
            if (selected.length === 2) {
              onSend({ type: 'exchange_cards', keepIndices: [selected[0], selected[1]] })
            }
          }}
          disabled={selected.length !== 2}
          className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Keep Selected ({selected.length}/2)
        </button>
      </div>
    </div>
  )
}
