import { useAppState } from './state/useAppState'
import { LandingPage } from './screens/LandingPage'
import { LobbyPage } from './screens/LobbyPage'

function ScreenPlaceholder({ name, wsStatus }: { name: string; wsStatus: string }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl text-amber-400 font-bold">{name}</h2>
        <p className="text-gray-400 text-sm mt-2">WS: {wsStatus}</p>
      </div>
    </div>
  )
}

function App() {
  const { state, createRoom, joinRoom, sendMessage, resetToLanding } = useAppState()

  switch (state.screen) {
    case 'LANDING':
      return (
        <LandingPage
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          error={state.error}
        />
      )

    case 'LOBBY':
      return (
        <LobbyPage
          roomState={state.roomState}
          myPlayerId={state.playerId ?? ''}
          chatMessages={state.chatMessages}
          wsStatus={state.wsStatus}
          onSendMessage={sendMessage}
          onLeave={resetToLanding}
        />
      )

    case 'GAME':
      return <ScreenPlaceholder name="Game" wsStatus={state.wsStatus} />

    case 'END_GAME':
      return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-amber-400 tracking-widest uppercase">
              {state.gameState?.winnerName ?? 'Someone'} Wins!
            </h2>
            <p className="text-gray-500">The coup is complete.</p>
            <button
              className="px-8 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold tracking-wide transition-colors"
              onClick={resetToLanding}
            >
              Play Again
            </button>
          </div>
        </div>
      )
  }
}

export default App
