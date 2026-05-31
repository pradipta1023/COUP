import type { ClientGameState, ClientMessage } from '@shared/types'
import type { ChatMessage, WsStatus } from '../state/types'
import { ActionLog } from '../components/ActionLog'
import { ActionPanel } from '../components/ActionPanel'
import { ChatPanel } from '../components/ChatPanel'
import { PersonalHUD } from '../components/PersonalHUD'
import { PlayerTable } from '../components/PlayerTable'
import { ReactionModal } from '../components/ReactionModal'
import { WsIndicator } from '../components/WsIndicator'

interface GamePageProps {
  gameState: ClientGameState
  myPlayerId: string
  chatMessages: ChatMessage[]
  wsStatus: WsStatus
  onSend: (msg: ClientMessage) => void
}

export function GamePage({ gameState, myPlayerId, chatMessages, wsStatus, onSend }: GamePageProps) {
  const me = gameState.players.find((p) => p.id === myPlayerId)
  const isMyTurn = gameState.turnState.currentPlayerId === myPlayerId
  const activePlayer = gameState.players.find((p) => p.id === gameState.turnState.currentPlayerId)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Status bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-gray-800 flex-shrink-0">
        <h1 className="text-base font-black tracking-widest text-amber-400 uppercase">COUP</h1>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">
            {gameState.players.filter((p) => !p.isEliminated).length} players left
          </span>
          <span className="text-gray-600">|</span>
          <span className={isMyTurn ? 'text-emerald-400 font-semibold' : 'text-gray-400'}>
            {isMyTurn ? 'Your turn' : `${activePlayer?.name ?? '…'}'s turn`}
          </span>
        </div>

        <WsIndicator status={wsStatus} />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main area */}
        <main className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto">
          {/* Other players table */}
          <section>
            <PlayerTable
              players={gameState.players}
              myPlayerId={myPlayerId}
              activePlayerId={gameState.turnState.currentPlayerId}
            />
          </section>

          {/* Action panel */}
          {me && !me.isEliminated && (
            <ActionPanel
              gameState={gameState}
              myPlayerId={myPlayerId}
              isMyTurn={isMyTurn}
              onSend={onSend}
            />
          )}

          {me?.isEliminated && (
            <div className="px-4 py-3 rounded-xl bg-gray-800/30 border border-gray-800 text-center text-gray-600 text-sm">
              You have been eliminated. Spectating…
            </div>
          )}

          {/* Personal HUD */}
          {me && (
            <PersonalHUD
              player={me}
              phase={gameState.turnState.phase}
              isMyTurn={isMyTurn}
            />
          )}
        </main>

        {/* Right sidebar: log + chat */}
        <aside className="w-72 flex flex-col border-l border-gray-800 flex-shrink-0">
          <div className="flex-1 overflow-hidden flex flex-col p-3 gap-3">
            <div className="flex-1 overflow-hidden">
              <ActionLog entries={gameState.actionLog} />
            </div>
            <div className="flex-shrink-0">
              <ChatPanel messages={chatMessages} onSend={onSend} maxHeight="h-36" />
            </div>
          </div>
        </aside>
      </div>

      {/* Reaction modal — overlays everything */}
      <ReactionModal gameState={gameState} myPlayerId={myPlayerId} onSend={onSend} />
    </div>
  )
}
