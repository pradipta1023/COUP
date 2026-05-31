import { useState } from 'react'
import type { ActionType, ClientGameState, ClientMessage } from '@shared/types'
import { getAvailableActions, getLivingTargets } from '../game/actions'

interface ActionPanelProps {
  gameState: ClientGameState
  myPlayerId: string
  isMyTurn: boolean
  onSend: (msg: ClientMessage) => void
}

export function ActionPanel({ gameState, myPlayerId, isMyTurn, onSend }: ActionPanelProps) {
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null)

  if (!isMyTurn || gameState.turnState.phase !== 'waiting_for_action') {
    return (
      <div className="border border-gray-800 rounded-xl bg-gray-900/30 px-4 py-6 text-center text-gray-600 text-sm">
        Waiting for {gameState.players.find((p) => p.id === gameState.turnState.currentPlayerId)?.name ?? '…'} to act
      </div>
    )
  }

  const actions = getAvailableActions(gameState, myPlayerId)
  const targets = getLivingTargets(gameState.players, myPlayerId)
  const needsTarget = pendingAction
    ? actions.find((a) => a.action === pendingAction)?.needsTarget ?? false
    : false

  const handleAction = (action: ActionType, targetPlayerId?: string) => {
    onSend({ type: 'take_action', action, targetPlayerId })
    setPendingAction(null)
  }

  if (needsTarget) {
    return (
      <div className="border border-gray-700 rounded-xl bg-gray-900/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPendingAction(null)}
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            ← Back
          </button>
          <span className="text-sm text-gray-300">
            Choose a target for <span className="text-amber-400 font-semibold capitalize">{pendingAction}</span>:
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {targets.map((t) => (
            <button
              key={t.id}
              onClick={() => handleAction(pendingAction!, t.id)}
              className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 hover:border-amber-600 hover:bg-amber-900/20 text-sm font-medium text-gray-200 transition-colors"
            >
              {t.name}
              <span className="ml-2 text-xs text-gray-500">{t.coins}💰</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-700 rounded-xl bg-gray-900/60 p-4">
      <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Your Actions</p>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <button
            key={a.action}
            disabled={a.disabled}
            onClick={() => {
              if (a.needsTarget) {
                setPendingAction(a.action)
              } else {
                handleAction(a.action)
              }
            }}
            className={`flex flex-col px-3 py-2.5 rounded-lg border text-left transition-colors ${
              a.disabled
                ? 'border-gray-800 bg-gray-900/30 opacity-40 cursor-not-allowed'
                : 'border-gray-600 bg-gray-800 hover:border-amber-600 hover:bg-amber-900/20 cursor-pointer'
            }`}
          >
            <span className="text-sm font-semibold text-gray-100">
              {a.label}
              {a.cost !== undefined && (
                <span className="ml-1 text-xs text-amber-500">({a.cost}💰)</span>
              )}
            </span>
            <span className="text-xs text-gray-500 mt-0.5">
              {a.disabled && a.disabledReason ? a.disabledReason : a.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
