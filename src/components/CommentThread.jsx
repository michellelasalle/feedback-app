import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function CommentThread({ ticketId, authorName, isManager }) {
  const [comments, setComments] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [replyTexts, setReplyTexts] = useState({})

  async function load() {
    const { data } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setLoaded(true)
  }

  function toggle() {
    if (!loaded) load()
    setOpen(o => !o)
  }

  async function postComment(parentId = null, txt, isReply = false) {
    if (!txt.trim()) return
    await supabase.from('ticket_comments').insert({
      ticket_id: ticketId,
      author_name: authorName,
      text: txt.trim(),
      is_manager_reply: isManager,
      parent_comment_id: parentId,
    })
    if (isReply) setReplyTexts(r => ({ ...r, [parentId]: '' }))
    else setText('')
    load()
  }

  const topLevel = comments.filter(c => !c.parent_comment_id)

  return (
    <div className="border-t border-slate-100 px-5 py-3">
      <button onClick={toggle} className="text-xs text-slate-500 hover:text-slate-700 font-medium">
        {loaded && comments.length > 0 ? `${comments.length} comment${comments.length > 1 ? 's' : ''}` : 'Comments'} {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {topLevel.map(c => (
            <div key={c.id}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-slate-700">{c.author_name}</span>
                <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-slate-600">{c.text}</p>
              {comments.filter(r => r.parent_comment_id === c.id).map(r => (
                <div key={r.id} className="ml-4 mt-2 pl-3 border-l-2 border-amber-200">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold" style={{ color: '#1a3a6e' }}>{r.author_name}</span>
                    <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-600">{r.text}</p>
                </div>
              ))}
              {isManager && (
                <div className="flex gap-2 mt-2 ml-4">
                  <input
                    value={replyTexts[c.id] || ''}
                    onChange={e => setReplyTexts(r => ({ ...r, [c.id]: e.target.value }))}
                    placeholder="Reply as manager…"
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={() => postComment(c.id, replyTexts[c.id] || '', true)}
                    className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
                    style={{ background: '#1a3a6e' }}>
                    Reply
                  </button>
                </div>
              )}
            </div>
          ))}
          {!isManager && (
            <div className="flex gap-2">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Ask a question or leave a note…"
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={() => postComment(null, text)}
                className="text-sm px-4 py-2 rounded-lg text-white font-medium"
                style={{ background: '#1a3a6e' }}>
                Post
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
