import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import TicketCard from '../components/TicketCard'

export default function ManagerDashboard() {
  const [agents, setAgents] = useState([])
  const [reports, setReports] = useState({})
  const [weekIdxs, setWeekIdxs] = useState({})
  const [ackMaps, setAckMaps] = useState({})
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ agentSlug: '', weekLabel: '', weekStart: '', ticketsRaw: '' })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  async function load() {
    const { data: ag } = await supabase
      .from('agent_profiles')
      .select('*')
      .order('display_name')
    setAgents(ag || [])

    const rMap = {}, aMap = {}
    for (const a of ag || []) {
      const { data: r } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('agent_slug', a.slug)
        .order('week_start', { ascending: false })
      rMap[a.slug] = r || []

      const { data: acks } = await supabase
        .from('ticket_acknowledgements')
        .select('ticket_id')
        .eq('agent_slug', a.slug)
      const m = {}
      acks?.forEach(x => { m[x.ticket_id] = true })
      aMap[a.slug] = m
    }
    setReports(rMap)
    setAckMaps(aMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createReport() {
    setSaving(true)
    setSaveMsg('')
    try {
      JSON.parse(form.ticketsRaw)
      await supabase.from('weekly_reports').insert({
        agent_slug: form.agentSlug,
        week_label: form.weekLabel,
        week_start: form.weekStart,
        tickets_json: form.ticketsRaw,
      })
      setSaveMsg('Report created successfully!')
      setShowCreate(false)
      setForm({ agentSlug: '', weekLabel: '', weekStart: '', ticketsRaw: '' })
      load()
    } catch(e) {
      setSaveMsg('Error: ' + e.message)
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f2044,#1a3a6e)' }}>
      <div className="text-white">Loading…</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div style={{ background: 'linear-gradient(135deg,#0f2044,#1a3a6e)' }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#f59e0b' }}>
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="text-white/60 text-sm font-medium tracking-wide uppercase">Tech Support</span>
            </div>
            <h1 className="text-white text-2xl font-bold">Weekly Feedback Reports</h1>
            <p className="text-white/50 text-sm mt-0.5">Manager Dashboard</p>
          </div>
          <button
            onClick={() => setShowCreate(s => !s)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white border border-white/20 hover:bg-white/10">
            {showCreate ? 'Cancel' : '+ New Report'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {saveMsg && (
          <div className={`mb-4 text-sm rounded-lg px-4 py-2 border ${saveMsg.startsWith('Error') ? 'text-red-700 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
            {saveMsg}
          </div>
        )}

        {showCreate && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
            <h2 className="font-semibold text-slate-800 mb-4">Create New Report</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Agent</label>
                <select
                  value={form.agentSlug}
                  onChange={e => setForm(f => ({ ...f, agentSlug: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  <option value="">Select agent…</option>
                  {agents.map(a => <option key={a.slug} value={a.slug}>{a.display_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Week Label (e.g. April 13, 2026)</label>
                <input
                  value={form.weekLabel}
                  onChange={e => setForm(f => ({ ...f, weekLabel: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Week Start Date</label>
                <input
                  type="date"
                  value={form.weekStart}
                  onChange={e => setForm(f => ({ ...f, weekStart: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-slate-500 block mb-1">Tickets JSON</label>
              <p className="text-xs text-slate-400 mb-2">Paste a JSON array of ticket objects. Each ticket needs: id, date, issue, feedback, tags, highlight, ticketUrl.</p>
              <textarea
                value={form.ticketsRaw}
                onChange={e => setForm(f => ({ ...f, ticketsRaw: e.target.value }))}
                rows={10}
                placeholder='[{"id":"TKT-001","date":"04/13/2026","issue":"...","feedback":"...","tags":["positive"],"highlight":"...","ticketUrl":""}]'
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-400" />
            </div>
            <button
              onClick={createReport}
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: '#1a3a6e' }}>
              {saving ? 'Saving…' : 'Save Report'}
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {agents.map(agent => {
            const wi = weekIdxs[agent.slug] ?? 0
            const agentReports = reports[agent.slug] || []
            const report = agentReports[wi]
            const tickets = report ? JSON.parse(report.tickets_json) : []
            const ackedCount = tickets.filter(t => ackMaps[agent.slug]?.[t.id]).length
            const topTag = tickets.some(t => t.tags?.includes('incorrect')) ? 'incorrect'
              : tickets.some(t => t.tags?.includes('improve')) ? 'improve' : 'positive'
            const tagColors = { positive: 'text-emerald-600', improve: 'text-amber-600', incorrect: 'text-red-600' }
            const tagLabels = { positive: 'Well Done', improve: 'Room to Grow', incorrect: 'Needs Correction' }

            return (
              <div key={agent.slug} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg,#1a3a6e,#2563eb)' }}>
                    {agent.display_name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{agent.display_name}</div>
                    <div className={`text-xs font-medium ${tagColors[topTag]}`}>{tagLabels[topTag]}</div>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-slate-800">{tickets.length}</div>
                    <div className="text-slate-400 text-xs">Tickets</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-emerald-600">{ackedCount}/{tickets.length}</div>
                    <div className="text-slate-400 text-xs">Acked</div>
                  </div>
                </div>
                {tickets.length > 0 && (
                  <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${(ackedCount / tickets.length) * 100}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Per-agent report sections */}
        {agents.map(agent => {
          const wi = weekIdxs[agent.slug] ?? 0
          const agentReports = reports[agent.slug] || []
          const report = agentReports[wi]
          const tickets = report
            ? JSON.parse(report.tickets_json).map(t => ({ ...t, acknowledged: !!(ackMaps[agent.slug]?.[t.id]) }))
            : []
          const ackedCount = tickets.filter(t => t.acknowledged).length

          return (
            <div key={agent.slug} className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"
                style={{ background: 'linear-gradient(90deg,#f8faff,#fff)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg,#1a3a6e,#2563eb)' }}>
                    {agent.display_name[0]}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">{agent.display_name}</span>
                    <div className="text-xs text-slate-400">/agent/{agent.slug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {report && <span className="text-sm text-emerald-600 font-medium">{ackedCount}/{tickets.length} acknowledged</span>}
                  {agentReports.length > 1 && (
                    <select
                      value={wi}
                      onChange={e => setWeekIdxs(w => ({ ...w, [agent.slug]: +e.target.value }))}
                      className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 bg-white">
                      {agentReports.map((r, i) => <option key={i} value={i}>{r.week_label}</option>)}
                    </select>
                  )}
                </div>
              </div>
              <div className="p-6 space-y-5">
                {tickets.length === 0 && <p className="text-slate-400 text-sm">No report for this week.</p>}
                {tickets.map(ticket => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    agentSlug={agent.slug}
                    isManager={true}
                    authorName="Manager"
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
