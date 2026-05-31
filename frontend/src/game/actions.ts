import type { ActionType, ClientGameState, ClientPlayer } from '@shared/types'

export interface AvailableAction {
  action: ActionType
  label: string
  description: string
  cost?: number
  needsTarget: boolean
  disabled: boolean
  disabledReason?: string
}

export function getAvailableActions(
  gameState: ClientGameState,
  playerId: string,
): AvailableAction[] {
  const me = gameState.players.find((p) => p.id === playerId)
  if (!me || me.isEliminated) return []

  const coins = me.coins
  const mustCoup = coins >= 10

  return [
    {
      action: 'income',
      label: 'Income',
      description: '+1 coin',
      needsTarget: false,
      disabled: mustCoup,
      disabledReason: mustCoup ? 'Must Coup at 10+ coins' : undefined,
    },
    {
      action: 'foreign_aid',
      label: 'Foreign Aid',
      description: '+2 coins (blockable)',
      needsTarget: false,
      disabled: mustCoup,
      disabledReason: mustCoup ? 'Must Coup at 10+ coins' : undefined,
    },
    {
      action: 'coup',
      label: 'Coup',
      description: 'Eliminate a player\'s influence',
      cost: 7,
      needsTarget: true,
      disabled: coins < 7,
      disabledReason: coins < 7 ? `Need ${7 - coins} more coins` : undefined,
    },
    {
      action: 'tax',
      label: 'Tax',
      description: '+3 coins (Duke)',
      needsTarget: false,
      disabled: mustCoup,
      disabledReason: mustCoup ? 'Must Coup at 10+ coins' : undefined,
    },
    {
      action: 'assassinate',
      label: 'Assassinate',
      description: 'Eliminate influence (Assassin)',
      cost: 3,
      needsTarget: true,
      disabled: mustCoup || coins < 3,
      disabledReason: mustCoup
        ? 'Must Coup at 10+ coins'
        : coins < 3
        ? `Need ${3 - coins} more coins`
        : undefined,
    },
    {
      action: 'steal',
      label: 'Steal',
      description: 'Take 2 coins (Captain)',
      needsTarget: true,
      disabled: mustCoup,
      disabledReason: mustCoup ? 'Must Coup at 10+ coins' : undefined,
    },
    {
      action: 'exchange',
      label: 'Exchange',
      description: 'Swap cards with deck (Ambassador)',
      needsTarget: false,
      disabled: mustCoup,
      disabledReason: mustCoup ? 'Must Coup at 10+ coins' : undefined,
    },
  ]
}

export function getLivingTargets(
  players: ClientPlayer[],
  myPlayerId: string,
): ClientPlayer[] {
  return players.filter((p) => p.id !== myPlayerId && !p.isEliminated)
}
