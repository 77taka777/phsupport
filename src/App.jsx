import { useState, useEffect } from 'react'
import Desk from './components/Desk.jsx'
import Result from './components/Result.jsx'
import { buildFallback } from './lib/kb.js'

const EXAMPLES = [
  '現地で人を10人くらい雇いたいけど、何から調べればいい？',
  'マニラに日本食レストランを出したい。外資100%でいける？',
  'BPOでコールセンターを作りたい。日本の顧客データを扱う',
  '駐在員を1人送るのに、ビザって何が要る？',
  'PEZAとBOI、うちはどっち？',
  '撤退するときって大変って聞いたけど、進出前に何を決めておく？',
]

export default function App() {
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('other')
  const [stage, setStage] = useState('research')
  const [japanBase, setJapanBase] = useState('unknown')
  const [employeeSize, setEmployeeSize] = useState('unknown')
  const [localHiring, setLocalHiring] = useState('unknown')
  const [remittanceToJapan, setRemittanceToJapan] = useState('unknown')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])

  useEffect(() => {
    fetch('/api/recent').then(r => r.ok ? r.json() : { items: [] })
      .then(d => { if (d?.items?.length) setHistory(d.items.map(i => ({ query: i.query, industry: i.industry, stage: i.stage, ...(i.result?.input_context || {}) }))) })
      .catch(() => {})
  }, [])

  async function consult(q = query, ind = industry, st = stage, profile = { japanBase, employeeSize, localHiring, remittanceToJapan }) {
    if (!q.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await fetch('/api/consult', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, industry: ind, stage: st, ...profile }),
      })
      if (!r.ok) throw new Error(`API ${r.status}`)
      const data = await r.json()
      setResult(data)
    } catch (e) {
      // API が無い環境（ローカル vite のみ等）でも KB だけで動く
      setResult({ ...buildFallback(q, { industry: ind, stage: st, ...profile }), note: `API 未接続のためブラウザ内 KB 照合のみ（${e.message}）` })
    } finally {
      setLoading(false)
      setHistory(h => [{ query: q, industry: ind, stage: st, ...profile }, ...h.filter(x => x.query !== q)].slice(0, 5))
    }
  }

  return (
    <div className="wrap">
      <header className="brand">
        <h1>PHsupport</h1>
        <p>フィリピン進出、まず何を見る？</p>
      </header>

      <Desk
        query={query} setQuery={setQuery}
        industry={industry} setIndustry={setIndustry}
        stage={stage} setStage={setStage}
        japanBase={japanBase} setJapanBase={setJapanBase}
        employeeSize={employeeSize} setEmployeeSize={setEmployeeSize}
        localHiring={localHiring} setLocalHiring={setLocalHiring}
        remittanceToJapan={remittanceToJapan} setRemittanceToJapan={setRemittanceToJapan}
        onSubmit={() => consult()} loading={loading}
      />

      <ul className="examples" aria-label="困りごとの例">
        {EXAMPLES.map(e => (
          <li key={e}><button type="button" onClick={() => { setQuery(e); consult(e) }}>{e}</button></li>
        ))}
      </ul>

      {loading && <p className="loading">論点DBと資料DBを照合して、専門家目線に組み替え中…</p>}
      {error && <p className="error">{error}</p>}
      {result && <Result data={result} />}

      {history.length > 0 && (
        <aside className="history">
          <h3>最近の相談</h3>
          {history.map((h, i) => (
            <button key={i} type="button" onClick={() => {
              const profile = {
                japanBase: h.japanBase || 'unknown', employeeSize: h.employeeSize || 'unknown',
                localHiring: h.localHiring || 'unknown', remittanceToJapan: h.remittanceToJapan || 'unknown',
              }
              setQuery(h.query); setIndustry(h.industry || 'other'); setStage(h.stage || 'research')
              setJapanBase(profile.japanBase); setEmployeeSize(profile.employeeSize)
              setLocalHiring(profile.localHiring); setRemittanceToJapan(profile.remittanceToJapan)
              consult(h.query, h.industry, h.stage, profile)
            }}>
              {h.query}
            </button>
          ))}
        </aside>
      )}

      <footer>
        法令・数値は変更が早いため、ここに出るものは「どこを見るか」の案内であり、最終判断は一次資料と専門家で確認すること。
        論点DB・資料DBは <code>data/</code> にあり、誰でも追記できる。
      </footer>
    </div>
  )
}
