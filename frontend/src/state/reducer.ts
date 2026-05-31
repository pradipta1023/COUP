import type { ClientGameState, RoomState, ServerMessage } from '@shared/types'
import type { AppState, ChatMessage, WsStatus } from './types'

export type AppAction =
  | { type: 'SET_WS_STATUS'; status: WsStatus }
  | { type: 'ENTER_LOBBY'; roomCode: string; playerId: string; playerName: string }
  | { type: 'ROOM_UPDATE'; roomState: RoomState }
  | { type: 'GAME_STARTED'; gameState: ClientGameState }
  | { type: 'GAME_STATE'; gameState: ClientGameState }
  | { type: 'GAME_OVER'; winnerId: string; winnerName: string }
  | { type: 'CHAT_MESSAGE'; msg: ChatMessage }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' }

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_WS_STATUS':
      return { ...state, wsStatus: action.status }

    case 'ENTER_LOBBY':
      return {
        ...state,
        screen: 'LOBBY',
        roomCode: action.roomCode,
        playerId: action.playerId,
        playerName: action.playerName,
        error: null,
      }

    case 'ROOM_UPDATE':
      return { ...state, roomState: action.roomState }

    case 'GAME_STARTED':
      return { ...state, screen: 'GAME', gameState: action.gameState, error: null }

    case 'GAME_STATE':
      // If the server embedded a winner in the game state, transition to END_GAME
      if (action.gameState.winnerId) {
        return { ...state, screen: 'END_GAME', gameState: action.gameState }
      }
      return { ...state, gameState: action.gameState }

    case 'GAME_OVER': {
      const updatedGameState = state.gameState
        ? { ...state.gameState, winnerId: action.winnerId, winnerName: action.winnerName }
        : null
      return { ...state, screen: 'END_GAME', gameState: updatedGameState }
    }

    case 'CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.msg] }

    case 'SET_ERROR':
      return { ...state, error: action.error }

    case 'RESET':
      return {
        screen: 'LANDING',
        roomCode: null,
        playerId: null,
        playerName: null,
        roomState: null,
        gameState: null,
        chatMessages: [],
        wsStatus: 'disconnected',
        error: null,
      }

    default:
      return state
  }
}

/** Maps an incoming ServerMessage to an AppAction (or null to ignore). */
export function serverMessageToAction(msg: ServerMessage): AppAction | null {
  switch (msg.type) {
    case 'room_update':
      return { type: 'ROOM_UPDATE', roomState: msg.room }
    case 'game_started':
      return { type: 'GAME_STARTED', gameState: msg.gameState }
    case 'game_state':
      return { type: 'GAME_STATE', gameState: msg.gameState }
    case 'game_over':
      return { type: 'GAME_OVER', winnerId: msg.winnerId, winnerName: msg.winnerName }
    case 'chat':
      return {
        type: 'CHAT_MESSAGE',
        msg: {
          playerId: msg.playerId,
          playerName: msg.playerName,
          message: msg.message,
          timestamp: msg.timestamp,
        },
      }
    case 'error':
      return { type: 'SET_ERROR', error: msg.message }
    case 'action_log':
      return null // action log is embedded in game_state
    default:
      return null
  }
}
