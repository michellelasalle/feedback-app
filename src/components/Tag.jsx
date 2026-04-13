const TAG_CONFIG = {
  positive: { label: 'Well Done', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  improve:  { label: 'Room to Grow', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  incorrect:{ label: 'Needs Correction', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
}

export default function Tag({ type }) {
  const c = TAG_CONFIG[type] || TAG_CONFIG.positive
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}
