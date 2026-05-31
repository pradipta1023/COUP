import type { ClientGameState, RoomState } from '@shared/types'

export type Screen = 'LANDING' | 'LOBBY' | 'GAME' | 'END_GAME'
export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ChatMessage {
  playerId: string
  playerName: string
  message: string
  timestamp: number
}

export interface AppState {
  screen: Screen
  roomCode: string | null
  playerId: string | null
  playerName: string | null
  roomState: RoomState | null
  gameState: ClientGameState | null
  chatMessages: ChatMessage[]
  wsStatus: WsStatus
  error: string | null
}

export const initialState: AppState = {
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
