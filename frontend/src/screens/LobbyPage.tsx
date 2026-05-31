import type { ClientMessage, RoomState } from '@shared/types'
import type { ChatMessage, WsStatus } from '../state/types'
import { RoomCode } from '../components/RoomCode'
import { PlayerList } from '../components/PlayerList'
import { ChatPanel } from '../components/ChatPanel'
import { WsIndicator } from '../components/WsIndicator'

interface LobbyPageProps {
  roomState: RoomState | null
  myPlayerId: string
  chatMessages: ChatMessage[]
  wsStatus: WsStatus
  onSendMessage: (msg: ClientMessage) => void
  onLeave: () => void
}

export function LobbyPage({
  roomState,
  myPlayerId,
  chatMessages,
  wsStatus,
  onSendMessage,
  onLeave,
}: LobbyPageProps) {
  const isHost = roomState?.hostPlayerId === myPlayerId
  const playerCount = roomState?.players.length ?? 0
  const canStart = isHost && playerCount >= 2

  const handleStart = () => onSendMessage({ type: 'start_game' })

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h1 className="text-xl font-black tracking-widest text-amber-400 uppercase">COUP</h1>
        {roomState && <RoomCode code={roomState.roomCode} />}
        <WsIndicator status={wsStatus} />
      </header>

      <main className="flex flex-1 gap-6 p-6 max-w-4xl mx-auto w-full">
        {/* Left: Players */}
        <section className="flex-1 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm uppercase tracking-widest text-gray-400">
                Players ({playerCount}/6)
              </h2>
            </div>
            {roomState ? (
              <PlayerList players={roomState.players} myPlayerId={myPlayerId} />
            ) : (
              <p className="text-gray-600 text-sm">Connecting…</p>
            )}
          </div>

          {/* Host controls */}
          <div className="space-y-3">
            {isHost ? (
              <div className="space-y-2">
                <button
                  onClick={handleStart}
                  disabled={!canStart}
                  className="w-full py-3 rounded-xl font-bold tracking-wide transition-colors bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {canStart ? 'Start Game' : `Need at least 2 players (${playerCount}/2)`}
                </button>
                {!canStart && playerCount < 2 && (
                  <p className="text-xs text-center text-gray-600">
                    Share the room code with friends to get started
                  </p>
                )}
              </div>
            ) : (
              <div className="px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-center text-sm text-gray-400">
                Waiting for host to start the game…
              </div>
            )}
            <button
              onClick={onLeave}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-400 transition-colors"
            >
              Leave Room
            </button>
          </div>
        </section>

        {/* Right: Chat */}
        <aside className="w-72 flex flex-col">
          <ChatPanel messages={chatMessages} onSend={onSendMessage} maxHeight="h-full flex-1" />
        </aside>
      </main>
    </div>
  )
}
