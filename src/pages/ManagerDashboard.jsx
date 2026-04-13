import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import TicketCard from '../components/TicketCard'

const EMPTY_TICKET = {
  id: '', date: '', issue: '', feedback: '', highlight: '', ticketUrl: '', tags: ['positive']
}

export default function ManagerDashboard() {
  const [agents, setAgents] = useState([])
  const [reports, setReports] = useState({})
  const [weekIdxs, setWeekIdxs] = useState({})
  const [ackMaps, setAckMaps] = useState({})
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ agentSlug: '', weekLabel: '', weekStart: '' })
  const [tickets, setTickets] = useState([{ ...EMPTY_TICKET }])
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

  async function generateFromFeedback(i) {
    const feedback = tickets[i].feedback
    if (!feedback.trim()) return
    setTickets(ts => ts.map((t, idx) => idx === i ? { ...t, generating: true } : t))
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: `Based on this support ticket feedback, generate two things:
1. A short "issue" summary (max 8 words, describes what the ticket was about)
2. A "highlight" (one sentence key takeaway for the agent)

Feedback: "${feedback}"

Respond ONLY with valid JSON, no markdown, no explanation:
{"issue": "...", "highlight": "..."}`
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const parsed = JSON.parse(text)
      setTickets(ts => ts.map((t, idx) => idx === i
        ? { ...t, issue: parsed.issue, highlight: parsed.highlight, generating: false }
        : t))
    } catch(e) {
      setTickets(ts => ts.map((t, idx) => idx === i ? { ...t, generating: false } : t))
    }
  }

  function updateTicket(i, field, value) {
    setTickets(ts => ts.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  function updateTicketTag(i, tag) {
    setTickets(ts => ts.map((t, idx) => {
      if (idx !== i) return t
      const has = t.tags.includes(tag)
      const next = has ? t.tags.filter(x => x !== tag) : [...t.tags, tag]
      return { ...t, tags: next.length === 0 ? [tag] : next }
    }))
  }

  function addTicket() {
    setTickets(ts => [...ts, { ...EMPTY_TICKET }])
  }

  function removeTicket(i) {
    setTickets(ts => ts.filter((_, idx) => idx !== i))
  }

  async function createReport() {
    setSaving(true)
    setSaveMsg('')
    try {
      if (!form.agentSlug || !form.weekLabel || !form.weekStart) throw new Error('Please fill in all report fields.')
      if (tickets.some(t => !t.id || !t.issue || !t.feedback || !t.highlight)) throw new Error('Please fill in all required ticket fields (ID, Issue, Feedback, Highlight).')

      const ticketsJson = JSON.stringify(tickets.map(t => ({
        ...t,
        date: t.date || form.weekStart,
      })))

      await supabase.from('weekly_reports').insert({
        agent_slug: form.agentSlug,
        week_label: form.weekLabel,
        week_start: form.weekStart,
        tickets_json: ticketsJson,
      })
      setSaveMsg('Report created successfully!')
      setShowCreate(false)
      setForm({ agentSlug: '', weekLabel: '', weekStart: '' })
      setTickets([{ ...EMPTY_TICKET }])
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
            onClick={() => { setShowCreate(s => !s); setSaveMsg('') }}
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

        {/* NEW REPORT FORM */}
        {showCreate && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
            <h2 className="font-semibold text-slate-800 mb-4">Create New Report</h2>

            {/* Report details */}
            <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-100">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Agent</label>
                <select
                  value={form.agentSlug}
                  onChange={e => setForm(f => ({ ...f, agentSlug: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  <option value="">Select agent…</option>
                  {agents.map(a => <option key={a.slug} value={a.slug}>{a.display_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Week Label</label>
                <input
                  value={form.weekLabel}
                  onChange={e => setForm(f => ({ ...f, weekLabel: e.target.value }))}
                  placeholder="e.g. April 13, 2026"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Week Start Date</label>
                <input
                  type="date"
                  value={form.weekStart}
                  onChange={e => setForm(f => ({ ...f, weekStart: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>

            {/* Tickets */}
            <h3 className="font-medium text-slate-700 mb-3">Tickets</h3>
            <div className="space-y-4">
              {tickets.map((ticket, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-600">Ticket {i + 1}</span>
                    {tickets.length > 1 && (
                      <button onClick={() => removeTicket(i)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Ticket ID <span className="text-red-400">*</span></label>
                      <input
                        value={ticket.id}
                        onChange={e => updateTicket(i, 'id', e.target.value)}
                        placeholder="e.g. TKT-001"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Date</label>
                      <input
                        type="date"
                        value={ticket.date}
                        onChange={e => updateTicket(i, 'date', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-slate-400 block mb-1">Issue <span className="text-red-400">*</span></label>
                    <input
                      value={ticket.issue}
                      onChange={e => updateTicket(i, 'issue', e.target.value)}
                      placeholder="Short description of the ticket"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400" />
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-slate-400 block mb-1">Feedback <span className="text-red-400">*</span></label>
                    <textarea
                      value={ticket.feedback}
                      onChange={e => updateTicket(i, 'feedback', e.target.value)}
                      placeholder="Full coaching feedback for the agent"
                      rows={3}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400" />
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-slate-400 block mb-1">Key Highlight <span className="text-red-400">*</span></label>
                    <input
                      value={ticket.highlight}
                      onChange={e => updateTicket(i, 'highlight', e.target.value)}
                      placeholder="One sentence key takeaway"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400" />
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-slate-400 block mb-1">Ticket URL (optional)</label>
                    <input
                      value={ticket.ticketUrl}
                      onChange={e => updateTicket(i, 'ticketUrl', e.target.value)}
                      placeholder="https://app.intercom.com/..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-2">Tags</label>
                    <div className="flex gap-2">
                      {['positive', 'improve', 'incorrect'].map(tag => {
                        const colors = {
                          positive: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                          improve: 'bg-amber-100 text-amber-700 border-amber-300',
                          incorrect: 'bg-red-100 text-red-700 border-red-300',
                        }
                        const labels = { positive: '✓ Well Done', improve: '↑ Room to Grow', incorrect: '✗ Needs Correction' }
                        const selected = ticket.tags.includes(tag)
                        return (
                          <button
                            key={tag}
                            onClick={() => updateTicketTag(i, tag)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${selected ? colors[tag] : 'bg-white text-slate-400 border-slate-200'}`}>
                            {labels[tag]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addTicket}
              className="mt-3 text-sm text-blue-500 hover:text-blue-700 font-medium">
              + Add another ticket
            </button>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={createReport}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: '#1a3a6e' }}>
                {saving ? 'Saving…' : 'Save Report'}
              </button>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {agents.map(agent => {
            const wi = weekIdxs[agent.slug] ?? 0
            const agentReports = reports[agent.slug] || []
            const report = agentReports[wi]
            const ticks = report ? JSON.parse(report.tickets_json) : []
            const ackedCount = ticks.filter(t => ackMaps[agent.slug]?.[t.id]).length
            const topTag = ticks.some(t => t.tags?.includes('incorrect')) ? 'incorrect'
              : ticks.some(t => t.tags?.includes('improve')) ? 'improve' : 'positive'
            const tagColors = { positive: 'text-emerald-600', improve: 'text-amber-600', incorrect: 'text-red-600' }
            const tagLabels = { positive: 'Well Done', improve: 'Room to Grow', incorrect: 'Needs Correction' }

            return (
              <div key={agent.slug} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm"
                      style={{ background: 'linear-gradient(135deg,#1a3a6e,#2563eb)' }}>
                      {agent.display_name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{agent.display_name}</div>
                      <div className={`text-xs font-medium ${tagColors[topTag]}`}>{tagLabels[topTag]}</div>
                    </div>
                  </div>
                  <a
                    href={`/agent/${agent.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg font-medium text-white hover:opacity-90"
                    style={{ background: '#1a3a6e' }}>
                    View →
                  </a>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-slate-800">{ticks.length}</div>
                    <div className="text-slate-400 text-xs">Tickets</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-emerald-600">{ackedCount}/{ticks.length}</div>
                    <div className="text-slate-400 text-xs">Acked</div>
                  </div>
                </div>
                {ticks.length > 0 && (
                  <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${(ackedCount / ticks.length) * 100}%` }} />
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
          const ticks = report
            ? JSON.parse(report.tickets_json).map(t => ({ ...t, acknowledged: !!(ackMaps[agent.slug]?.[t.id]) }))
            : []
          const ackedCount = ticks.filter(t => t.acknowledged).length

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
                    <div className="text-xs text-slate-400">
                      <a href={`/agent/${agent.slug}`} target="_blank" rel="noreferrer"
                        className="hover:text-blue-500 hover:underline">
                        /agent/{agent.slug} ↗
                      </a>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {report && <span className="text-sm text-emerald-600 font-medium">{ackedCount}/{ticks.length} acknowledged</span>}
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
                {ticks.length === 0 && <p className="text-slate-400 text-sm">No report for this week.</p>}
                {ticks.map(ticket => (
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
