import { useState } from 'react'
import Tag from './Tag'
import CommentThread from './CommentThread'
import { supabase } from '../supabaseClient'

export default function TicketCard({ ticket, agentSlug, isManager, authorName }) {
  const [acked, setAcked] = useState(ticket.acknowledged)

  const borderColor = ticket.tags?.includes('incorrect') ? '#ef4444'
    : ticket.tags?.includes('improve') ? '#f59e0b' : '#10b981'

  async function acknowledge() {
    await supabase.from('ticket_acknowledgements').upsert({
      ticket_id: ticket.id,
      agent_slug: agentSlug
    })
    setAcked(true)
  }

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400">{ticket.id}</span>
            <span className="text-xs text-slate-400">· {ticket.date}</span>
            {ticket.tags?.map(t => <Tag key={t} type={t} />)}
          </div>
          {!isManager && (
            acked
              ? <span className="text-xs text-emerald-600 font-medium flex-shrink-0">✓ Acknowledged</span>
              : <button
                  onClick={acknowledge}
                  className="text-xs px-3 py-1.5 rounded-lg text-white font-medium flex-shrink-0"
                  style={{ background: '#1a3a6e' }}>
                  Acknowledge
                </button>
          )}
          {isManager && acked && (
            <span className="text-xs text-emerald-600 font-medium flex-shrink-0">✓ Acknowledged</span>
          )}
        </div>

        <h3 className="font-semibold text-slate-800 mb-2">{ticket.issue}</h3>

        <div className="rounded-lg p-3 mb-3 text-sm" style={{ background: '#f8faff', borderLeft: `3px solid ${borderColor}` }}>
          <span className="font-medium text-slate-500 text-xs uppercase tracking-wide block mb-1">Key Takeaway</span>
          <p className="text-slate-700 font-medium">{ticket.highlight}</p>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">{ticket.feedback}</p>

        {ticket.ticketUrl && (
          <a
            href={ticket.ticketUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-500 hover:underline mt-2 inline-block">
            View original ticket ↗
          </a>
        )}
      </div>
      <CommentThread ticketId={ticket.id} authorName={authorName} isManager={isManager} />
    </div>
  )
}
