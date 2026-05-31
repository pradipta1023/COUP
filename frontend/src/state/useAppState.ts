import { useCallback, useEffect, useReducer, useMemo } from 'react'
import type { ClientMessage, ServerMessage } from '@shared/types'
import { BACKEND_HTTP, BACKEND_WS } from '../config'
import { initialState } from './types'
import { reducer, serverMessageToAction } from './reducer'
import { useWebSocket } from './useWebSocket'

const LS_PLAYER_ID = 'coup_player_id'
const LS_ROOM_CODE = 'coup_room_code'
const LS_PLAYER_NAME = 'coup_player_name'

function saveSession(roomCode: string, playerId: string, playerName: string) {
  localStorage.setItem(LS_ROOM_CODE, roomCode)
  localStorage.setItem(LS_PLAYER_ID, playerId)
  localStorage.setItem(LS_PLAYER_NAME, playerName)
}

function clearSession() {
  localStorage.removeItem(LS_ROOM_CODE)
  localStorage.removeItem(LS_PLAYER_ID)
  localStorage.removeItem(LS_PLAYER_NAME)
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const wsUrl =
    state.roomCode && state.playerId
      ? `${BACKEND_WS}/ws/${state.roomCode}/${state.playerId}`
      : null

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    const action = serverMessageToAction(msg)
    if (action) dispatch(action)
  }, [])

  // wsStatus comes directly from the hook — no need to sync into reducer
  const { status: wsStatus, send } = useWebSocket(wsUrl, handleServerMessage)

  // On mount: attempt reconnect from localStorage
  useEffect(() => {
    const roomCode = localStorage.getItem(LS_ROOM_CODE)
    const playerId = localStorage.getItem(LS_PLAYER_ID)
    const playerName = localStorage.getItem(LS_PLAYER_NAME)
    if (!roomCode || !playerId || !playerName) return

    fetch(`${BACKEND_HTTP}/rooms/${roomCode}`)
      .then((r) => {
        if (!r.ok) throw new Error('Room gone')
        return r.json() as Promise<{ status: string }>
      })
      .then((room) => {
        if (room.status === 'lobby' || room.status === 'in_game') {
          dispatch({ type: 'ENTER_LOBBY', roomCode, playerId, playerName })
        } else {
          clearSession()
        }
      })
      .catch(() => clearSession())
  }, [])

  const createRoom = useCallback(async (playerName: string) => {
    dispatch({ type: 'SET_ERROR', error: '' })
    try {
      const res = await fetch(`${BACKEND_HTTP}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: playerName }),
      })
      if (!res.ok) throw new Error('Failed to create room')
      const { roomCode, playerId } = (await res.json()) as { roomCode: string; playerId: string }
      saveSession(roomCode, playerId, playerName)
      dispatch({ type: 'ENTER_LOBBY', roomCode, playerId, playerName })
    } catch (e) {
      const msg = e instanceof TypeError
        ? 'Cannot reach server — is the backend running on port 8000?'
        : e instanceof Error ? e.message : 'Network error'
      dispatch({ type: 'SET_ERROR', error: msg })
    }
  }, [])

  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    dispatch({ type: 'SET_ERROR', error: '' })
    try {
      const code = roomCode.toUpperCase().trim()
      const check = await fetch(`${BACKEND_HTTP}/rooms/${code}`).catch(() => {
        throw new TypeError('fetch')
      })
      if (!check.ok) throw new Error(check.status === 404 ? 'Room not found — check the code and try again' : 'Server error')
      const roomData = (await check.json()) as { status: string }
      if (roomData.status === 'in_game') throw new Error('Game already in progress')

      const joinRes = await fetch(`${BACKEND_HTTP}/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName }),
      })
      if (!joinRes.ok) {
        const err = (await joinRes.json()) as { error?: string }
        throw new Error(err.error ?? 'Failed to join room')
      }
      const { playerId } = (await joinRes.json()) as { playerId: string }
      saveSession(code, playerId, playerName)
      dispatch({ type: 'ENTER_LOBBY', roomCode: code, playerId, playerName })
    } catch (e) {
      const msg = e instanceof TypeError
        ? 'Cannot reach server — is the backend running on port 8000?'
        : e instanceof Error ? e.message : 'Network error'
      dispatch({ type: 'SET_ERROR', error: msg })
    }
  }, [])

  const sendMessage = useCallback((msg: ClientMessage) => {
    send(msg)
  }, [send])

  const resetToLanding = useCallback(() => {
    clearSession()
    dispatch({ type: 'RESET' })
  }, [])

  // Merge wsStatus from hook into state so consumers only need one object
  const mergedState = useMemo(() => ({ ...state, wsStatus }), [state, wsStatus])

  return { state: mergedState, createRoom, joinRoom, sendMessage, resetToLanding }
}
