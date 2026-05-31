import { useState } from 'react'

interface LandingPageProps {
  onCreateRoom: (playerName: string) => void
  onJoinRoom: (roomCode: string, playerName: string) => void
  error: string | null
  isLoading?: boolean
}

export function LandingPage({ onCreateRoom, onJoinRoom, error, isLoading }: LandingPageProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [nameError, setNameError] = useState('')
  const [codeError, setCodeError] = useState('')

  const validateName = () => {
    if (!name.trim()) { setNameError('Name is required'); return false }
    if (name.trim().length > 24) { setNameError('Max 24 characters'); return false }
    setNameError('')
    return true
  }

  const validateCode = () => {
    if (code.trim().length !== 6) { setCodeError('Room code must be 6 characters'); return false }
    setCodeError('')
    return true
  }

  const handleCreate = () => {
    if (!validateName()) return
    onCreateRoom(name.trim())
  }

  const handleJoin = () => {
    if (!validateName() | !validateCode()) return
    onJoinRoom(code.trim(), name.trim())
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Title */}
      <div className="mb-12 text-center">
        <h1 className="text-6xl font-black tracking-[0.2em] uppercase text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.3)]">
          COUP
        </h1>
        <p className="mt-3 text-gray-500 tracking-widest text-xs uppercase">
          Deception · Bluffing · Intrigue
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/40 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {mode === 'menu' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold tracking-wide transition-colors disabled:opacity-50"
            >
              Create Game
            </button>
            <button
              onClick={() => setMode('join')}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-gray-100 font-bold tracking-wide transition-colors disabled:opacity-50"
            >
              Join Game
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-100">Create a Room</h2>
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Your Name</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                maxLength={24}
                placeholder="e.g. Alice"
                className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-600 outline-none focus:border-amber-600 transition-colors"
              />
              {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
            </div>
            <button
              onClick={handleCreate}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating…' : 'Create Room'}
            </button>
            <button onClick={() => setMode('menu')} className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors">
              ← Back
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-100">Join a Room</h2>
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Room Code</label>
              <input
                autoFocus
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABC123"
                className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-600 font-mono tracking-widest outline-none focus:border-amber-600 transition-colors uppercase"
              />
              {codeError && <p className="mt-1 text-xs text-red-400">{codeError}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                maxLength={24}
                placeholder="e.g. Bob"
                className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-600 outline-none focus:border-amber-600 transition-colors"
              />
              {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
            </div>
            <button
              onClick={handleJoin}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Joining…' : 'Join Room'}
            </button>
            <button onClick={() => setMode('menu')} className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors">
              ← Back
            </button>
          </div>
        )}
      </div>

      <p className="mt-8 text-gray-700 text-xs">2–6 players · No account required</p>
    </div>
  )
}
