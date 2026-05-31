import type { ClientGameState } from '@shared/types'

interface EndGamePageProps {
  gameState: ClientGameState | null
  myPlayerId: string
  onPlayAgain: () => void
}

export function EndGamePage({ gameState, myPlayerId, onPlayAgain }: EndGamePageProps) {
  const winnerId = gameState?.winnerId
  const winnerName = gameState?.winnerName ?? 'Unknown'
  const isWinner = winnerId === myPlayerId

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md w-full">
        {/* Trophy / skull */}
        <div className="text-7xl">
          {isWinner ? '👑' : '💀'}
        </div>

        {/* Winner announcement */}
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-widest text-amber-400 uppercase drop-shadow-[0_0_30px_rgba(251,191,36,0.4)]">
            {isWinner ? 'You Win!' : `${winnerName} Wins!`}
          </h1>
          <p className="text-gray-500 tracking-wide">
            {isWinner ? 'The coup was yours to take.' : 'Better luck next time.'}
          </p>
        </div>

        {/* Final scoreboard */}
        {gameState && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
            <p className="text-xs uppercase tracking-widest text-gray-600 mb-3">Final Standings</p>
            {gameState.players.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className={`font-medium ${p.id === winnerId ? 'text-amber-400' : 'text-gray-400'}`}>
                  {p.id === winnerId && '👑 '}
                  {p.name}
                  {p.id === myPlayerId && <span className="ml-1 text-gray-600">(you)</span>}
                </span>
                <span className={p.isEliminated ? 'text-gray-700' : 'text-emerald-400'}>
                  {p.isEliminated ? 'Eliminated' : 'Survived'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onPlayAgain}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold tracking-wide transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  )
}
