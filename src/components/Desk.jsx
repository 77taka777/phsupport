import { INDUSTRIES, STAGES, JAPAN_BASE_OPTIONS, EMPLOYEE_SIZE_OPTIONS, LOCAL_HIRING_OPTIONS, REMITTANCE_OPTIONS } from '../lib/kb.js'

export default function Desk({
  query, setQuery, industry, setIndustry, stage, setStage,
  japanBase, setJapanBase, employeeSize, setEmployeeSize,
  localHiring, setLocalHiring, remittanceToJapan, setRemittanceToJapan,
  onSubmit, loading,
}) {
  return (
    <div className="desk">
      <h2>困りごとを、そのまま書いて。</h2>
      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSubmit() }}
        placeholder="例：セブでソフト開発の拠点を作りたい。人の雇い方と税金がよく分からない。"
        aria-label="困りごと"
      />
      <div className="row" role="group" aria-label="業種">
        <span className="lbl">業種</span>
        {INDUSTRIES.map(i => (
          <button key={i.id} type="button" className="pill" aria-pressed={industry === i.id} onClick={() => setIndustry(i.id)}>{i.label}</button>
        ))}
      </div>
      <div className="row" role="group" aria-label="段階">
        <span className="lbl">段階</span>
        {STAGES.map(s => (
          <button key={s.id} type="button" className="pill" aria-pressed={stage === s.id} onClick={() => setStage(s.id)}>{s.label}</button>
        ))}
      </div>
      <div className="row" role="group" aria-label="日本拠点の有無">
        <span className="lbl">日本拠点</span>
        {JAPAN_BASE_OPTIONS.map(option => (
          <button key={option.id} type="button" className="pill" aria-pressed={japanBase === option.id} onClick={() => setJapanBase(option.id)}>{option.label}</button>
        ))}
      </div>
      <div className="row" role="group" aria-label="従業員規模">
        <span className="lbl">従業員規模</span>
        {EMPLOYEE_SIZE_OPTIONS.map(option => (
          <button key={option.id} type="button" className="pill" aria-pressed={employeeSize === option.id} onClick={() => setEmployeeSize(option.id)}>{option.label}</button>
        ))}
      </div>
      <div className="row" role="group" aria-label="現地雇用の有無">
        <span className="lbl">現地雇用</span>
        {LOCAL_HIRING_OPTIONS.map(option => (
          <button key={option.id} type="button" className="pill" aria-pressed={localHiring === option.id} onClick={() => setLocalHiring(option.id)}>{option.label}</button>
        ))}
      </div>
      <div className="row" role="group" aria-label="日本への送金の有無">
        <span className="lbl">日本への送金</span>
        {REMITTANCE_OPTIONS.map(option => (
          <button key={option.id} type="button" className="pill" aria-pressed={remittanceToJapan === option.id} onClick={() => setRemittanceToJapan(option.id)}>{option.label}</button>
        ))}
      </div>
      <div className="submit">
        <button type="button" className="go" onClick={onSubmit} disabled={loading || !query.trim()}>何を見ればいいか教えて</button>
        <span className="hint">Ctrl/⌘ + Enter でも送れる</span>
      </div>
    </div>
  )
}
