import { useAppState } from './state/useAppState'
import { LandingPage } from './screens/LandingPage'
import { LobbyPage } from './screens/LobbyPage'
import { GamePage } from './screens/GamePage'
import { EndGamePage } from './screens/EndGamePage'

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
      return state.gameState ? (
        <GamePage
          gameState={state.gameState}
          myPlayerId={state.playerId ?? ''}
          chatMessages={state.chatMessages}
          wsStatus={state.wsStatus}
          onSend={sendMessage}
        />
      ) : null

    case 'END_GAME':
      return (
        <EndGamePage
          gameState={state.gameState}
          myPlayerId={state.playerId ?? ''}
          onPlayAgain={resetToLanding}
        />
      )
  }
}

export default App
