'use client'
import { useState } from 'react'

const QUICK_PROMPTS = [
  'Give me an operations briefing: what needs my attention right now?',
  'Which approved requests are still waiting for a trip, and why might they not have been grouped?',
  'Which vehicles are underused, and which trips are close to capacity?',
  'Summarise pending and rejected claims and how GPS validation treated them.',
]

const SEVERITY_STYLES = {
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  critical: 'border-red-500/30 bg-red-500/10 text-red-300',
}

export default function AssistantChat() {
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState([])
  const [busy, setBusy] = useState(false)

  async function ask(q) {
    const text = (q ?? question).trim()
    if (text.length < 3 || busy) return

    const id = Date.now()
    setBusy(true)
    setQuestion('')
    setTurns((t) => [{ id, question: text, status: 'loading' }, ...t])

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, status: 'done', data } : x)))
    } catch (err) {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, status: 'error', error: err.message } : x)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              ask()
            }
          }}
          maxLength={500}
          rows={2}
          placeholder="e.g. Why was claim X rejected? Which trips are not ready to dispatch?"
          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 resize-none"
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => ask(p)}
                disabled={busy}
                className="text-xs text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 rounded-full px-3 py-1 transition-colors disabled:opacity-40"
              >
                {p.length > 42 ? p.slice(0, 42) + '…' : p}
              </button>
            ))}
          </div>
          <button
            onClick={() => ask()}
            disabled={busy || question.trim().length < 3}
            className="bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0"
          >
            {busy ? 'Thinking…' : 'Ask'}
          </button>
        </div>
      </div>

      {turns.map((t) => (
        <Turn key={t.id} turn={t} />
      ))}
    </div>
  )
}

function Turn({ turn }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">
        <span className="text-gray-600">You asked: </span>
        {turn.question}
      </p>

      {turn.status === 'loading' && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 text-sm text-gray-500 animate-pulse">
          Querying logistics data… the first request can take up to a minute if the AI service is waking up.
        </div>
      )}

      {turn.status === 'error' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {turn.error}
        </div>
      )}

      {turn.status === 'done' && <Answer data={turn.data} />}
    </div>
  )
}

function Answer({ data }) {
  const { answer, tools_used, knowledge_sources } = data
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 divide-y divide-gray-800">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-sky-400">✦ AI insight</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-800 rounded px-1.5 py-0.5">
            Advisory only
          </span>
          <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-800 rounded px-1.5 py-0.5">
            Confidence: {answer.confidence}
          </span>
        </div>
        <p className="text-sm text-gray-200 leading-relaxed">{answer.summary}</p>
      </div>

      {answer.insights.length > 0 && (
        <div className="p-5 space-y-3">
          {answer.insights.map((i, idx) => (
            <div key={idx} className={`rounded-lg border px-4 py-3 ${SEVERITY_STYLES[i.severity] ?? SEVERITY_STYLES.info}`}>
              <p className="text-sm font-medium">{i.title}</p>
              <p className="text-xs mt-1 opacity-90 leading-relaxed">{i.detail}</p>
              {i.related_ids.length > 0 && (
                <p className="text-[11px] mt-2 font-mono opacity-60 break-all">{i.related_ids.join(' · ')}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {answer.recommended_actions.length > 0 && (
        <div className="p-5">
          <p className="text-xs font-medium text-gray-400 mb-2">Suggested next steps (for you to decide)</p>
          <ul className="space-y-1.5 list-disc list-inside text-sm text-gray-300">
            {answer.recommended_actions.map((a, idx) => (
              <li key={idx}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {answer.data_gaps.length > 0 && (
        <div className="p-5">
          <p className="text-xs font-medium text-gray-400 mb-2">What I couldn&apos;t determine</p>
          <ul className="space-y-1 list-disc list-inside text-xs text-gray-500">
            {answer.data_gaps.map((g, idx) => (
              <li key={idx}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-5 py-3 text-[11px] text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
        <span>Data tools: {tools_used.length ? tools_used.join(', ') : 'none'}</span>
        <span>Policy docs: {knowledge_sources.length ? knowledge_sources.join(', ') : 'none'}</span>
      </div>
    </div>
  )
}