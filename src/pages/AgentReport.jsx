import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import TicketCard from '../components/TicketCard'

export default function AgentReport() {
  const { slug } = useParams()
  const [agent, setAgent] = useState(null)
  const [reports, setReports] = useState([])
  const [weekIdx, setWeekIdx] = useState(0)
  const [ackMap, setAckMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: a } = await supabase
        .from('agent_profiles')
        .select('*')
        .eq('slug', slug)
        .single()
      setAgent(a)

      const { data: r } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('agent_slug', slug)
        .order('week_start', { ascending: false })
      setReports(r || [])

      const { data: acks } = await supabase
        .from('ticket_acknowledgements')
        .select('ticket_id')
        .eq('agent_slug', slug)
      const map = {}
      acks?.forEach(a => { map[a.ticket_id] = true })
      setAckMap(map)

      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f2044,#1a3a6e)' }}>
      <div className="text-white">Loading…</div>
    </div>
  )

  if (!agent) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-500">Agent not found.</div>
    </div>
  )

  const report = reports[weekIdx]
  const tickets = report
    ? JSON.parse(report.tickets_json).map(t => ({ ...t, acknowledged: !!ackMap[t.id] }))
    : []
  const ackedCount = tickets.filter(t => t.acknowledged).length

  return (
    <div className="min-h-screen bg-slate-50">
      <div style={{ background: 'linear-gradient(135deg,#0f2044,#1a3a6e)' }}>
        <div className="max-w-3xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#f59e0b' }}>
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <div>
                <div className="text-white/50 text-xs uppercase tracking-wide">My Feedback Report</div>
                <div className="text-white font-bold">{agent.display_name}</div>
              </div>
            </div>
            {reports.length > 1 && (
              <select
                value={weekIdx}
                onChange={e => setWeekIdx(+e.target.value)}
                className="text-sm rounded-lg px-3 py-1.5 font-medium border-0 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                {reports.map((r, i) => (
                  <option key={i} value={i} style={{ color: '#000' }}>{r.week_label}</option>
                ))}
              </select>
            )}
          </div>
          {report && (
            <div className="mt-4 flex items-center gap-6">
              <div className="text-white/70 text-sm">{tickets.length} tickets reviewed</div>
              <div className="text-emerald-400 text-sm font-medium">{ackedCount}/{tickets.length} acknowledged</div>
              <div className="flex-1 bg-white/10 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${tickets.length > 0 ? (ackedCount / tickets.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
        {tickets.length === 0 && (
          <p className="text-slate-400 text-sm">No report for this week yet.</p>
        )}
        {tickets.map(ticket => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            agentSlug={slug}
            isManager={false}
            authorName={agent.display_name}
          />
        ))}
      </div>
    </div>
  )
}
