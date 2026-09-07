const OFFICIAL_AGENCIES = [
  { name: 'SEC（会社登記・外資規制）', url: 'https://www.sec.gov.ph/' },
  { name: 'DTI（貿易産業省）', url: 'https://www.dti.gov.ph/' },
  { name: 'BIR（内国歳入庁・税務）', url: 'https://www.bir.gov.ph/' },
  { name: 'DOLE（労働雇用省）', url: 'https://www.dole.gov.ph/' },
  { name: 'JETRO（フィリピン進出情報）', url: 'https://www.jetro.go.jp/world/asia/ph/' },
  { name: 'BOI（投資委員会）', url: 'https://boi.gov.ph/' },
  { name: 'PEZA（経済区庁）', url: 'https://www.peza.gov.ph/' },
]

// LLM 構造化結果（mode=llm）と KB のみ結果（mode=kb-only）の両方を描画
export default function Result({ data }) {
  const isLLM = data.mode === 'llm'
  const kb = data.kb || data
  const topics = isLLM ? data.topics : (kb.topics || [])
  const kbTopicMap = Object.fromEntries((kb.topics || []).map(t => [t.id, t]))
  const reading = isLLM ? data.reading_order : (kb.sources || []).slice(0, 8).map(s => ({ source_id: s.id, title: s.title, publisher: s.publisher, url: s.url, read_for: s.why, url_verified: s.url_verified }))
  const srcMap = Object.fromEntries((kb.sources || []).map(s => [s.id, s]))
  const references = reading.reduce((items, r) => {
    const s = srcMap[r.source_id] || {}
    const url = r.url || s.url
    if (url && !items.some(item => item.url === url)) {
      items.push({ title: r.title || s.title, publisher: r.publisher || s.publisher, url })
    }
    return items
  }, [])
  const questions = isLLM ? data.questions : (data.questions || []).map(q => ({ to: q.topic, q: q.q }))
  const actions = data.next_actions || []

  // 質問を「誰に」でグループ化
  const groups = questions.reduce((acc, q) => { (acc[q.to] ||= []).push(q.q); return acc }, {})

  return (
    <div className="result">
      <p className="headline">{data.headline}</p>
      {data.reframe && <p className="reframe">{data.reframe}</p>}
      {!isLLM && data.summary && <p className="reframe">{data.summary.split('\n')[0]}</p>}
      <p className="mode">
        {isLLM ? <><b>専門家モード</b>（{data.model}{data.cached ? '・キャッシュ' : ''}）</> : <><b>KB照合モード</b>{data.note ? `　${data.note}` : ''}</>}
      </p>

      <section className="block">
        <h3>見る順番<small>この順で読めば全体像がつながる</small></h3>
        <ol className="reading">
          {reading.map((r, i) => {
            const s = srcMap[r.source_id] || {}
            const unverified = (r.url_verified ?? s.url_verified) === false
            return (
              <li key={r.source_id || i}>
                <div>
                  <a href={r.url || s.url} target="_blank" rel="noreferrer" className="t">{r.title || s.title}</a>
                  <span className="pub">{r.publisher || s.publisher}</span>
                  {unverified && <span className="unv">URL要確認</span>}
                  <div className="for">{r.read_for}</div>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="block">
        <h3>本当の論点<small>困りごとを専門家の言葉に翻訳すると</small></h3>
        {topics.map(t => {
          const full = kbTopicMap[t.id] || t
          return (
            <article className="topic" key={t.id}>
              <h4>{t.title}</h4>
              <p className="why">{t.why_now || t.summary}</p>
              {t.watch_out && <p className="warn">{t.watch_out}</p>}
              <div className="meta">
                {(full.agencies || []).map(a => <span className="chip" key={a}>{a}</span>)}
                {(full.laws || []).map(l => <span className="chip law" key={l}>{l}</span>)}
                {full.verify_flag && <span className="chip" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}>数値・法令は要確認</span>}
              </div>
              {full.key_points && (
                <details className="kp">
                  <summary>要点を開く（{full.key_points.length}）</summary>
                  <ul>{full.key_points.map((p, i) => <li key={i}>{p}</li>)}</ul>
                </details>
              )}
            </article>
          )
        })}
      </section>

      <section className="block">
        <h3>専門家に聞くこと<small>そのまま口に出せる形で</small></h3>
        {Object.entries(groups).map(([to, qs]) => (
          <div className="qgroup" key={to}>
            <h4>{to}</h4>
            <ul>{qs.map((q, i) => <li key={i}>{q}</li>)}</ul>
          </div>
        ))}
      </section>

      {actions.length > 0 && (
        <section className="block">
          <h3>今週やること</h3>
          <ul className="actions">{actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </section>
      )}

      {data.confidence_note && <p className="note">{data.confidence_note}</p>}

      <section className="block references">
        <h3>参照した資料・公式機関<small>回答の根拠を確認できます</small></h3>
        <h4>この回答で参照した資料</h4>
        <ul>
          {references.map(r => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
              {r.publisher && <span>{r.publisher}</span>}
            </li>
          ))}
        </ul>
        <h4>主な公式機関</h4>
        <ul className="agency-links">
          {OFFICIAL_AGENCIES.map(agency => (
            <li key={agency.name}><a href={agency.url} target="_blank" rel="noreferrer">{agency.name}</a></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
