import { PROFILE_AXES } from '../lib/kb.js'

export default function Desk({ query, setQuery, profile, setProfile, onSubmit, loading }) {
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
      <p className="desk-note">下の6つを選ぶと、当てはまらない論点を落として、当てはまるものを具体化する。</p>
      {PROFILE_AXES.map(ax => (
        <div className="row" role="group" aria-label={ax.label} key={ax.id}>
          <span className="lbl">{ax.label}</span>
          {ax.options.map(o => (
            <button key={o.id} type="button" className="pill" aria-pressed={profile[ax.id] === o.id}
              onClick={() => setProfile(p => ({ ...p, [ax.id]: o.id }))}>{o.label}</button>
          ))}
        </div>
      ))}
      <div className="submit">
        <button type="button" className="go" onClick={onSubmit} disabled={loading || !query.trim()}>何を見ればいいか教えて</button>
        <span className="hint">Ctrl/⌘ + Enter でも送れる</span>
      </div>
    </div>
  )
}
