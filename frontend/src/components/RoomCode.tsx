interface RoomCodeProps {
  code: string
}

export function RoomCode({ code }: RoomCodeProps) {
  const copy = () => navigator.clipboard.writeText(code).catch(() => null)

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs uppercase tracking-widest text-gray-400">Room</span>
      <button
        onClick={copy}
        title="Click to copy"
        className="font-mono text-2xl font-bold tracking-[0.3em] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer select-all"
      >
        {code}
      </button>
    </div>
  )
}
