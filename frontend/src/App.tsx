import { useAppState } from './state/useAppState'

// Placeholder screens — replaced in Tasks 7 & 8
function LandingPage({ onCreateRoom, onJoinRoom, error }: {
  onCreateRoom: (name: string) => void
  onJoinRoom: (code: string, name: string) => void
  error: string | null
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-widest uppercase text-amber-400">Coup</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          className="block w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded font-semibold"
          onClick={() => onCreateRoom('Player')}
        >
          Create Game
        </button>
        <button
          className="block w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded font-semibold"
          onClick={() => onJoinRoom('TEST', 'Player')}
        >
          Join Game
        </button>
      </div>
    </div>
  )
}

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
  void sendMessage // will be used in Tasks 7 & 8

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
      return <ScreenPlaceholder name="Lobby" wsStatus={state.wsStatus} />
    case 'GAME':
      return <ScreenPlaceholder name="Game" wsStatus={state.wsStatus} />
    case 'END_GAME':
      return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-3xl text-amber-400 font-bold">
              {state.gameState?.winnerName ?? 'Someone'} wins!
            </h2>
            <button
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded font-semibold"
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
