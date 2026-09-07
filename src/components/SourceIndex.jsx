// KB に登録されている資料一覧（発行元ごと）。ページ末尾で開閉。
import { useState } from 'react'
import { SOURCES } from '../lib/kb.js'

const ORDER = ['JETRO', 'JBIC（国際協力銀行）', 'JBIC', 'JICA', 'JICA / 外務省', '中小企業基盤整備機構', '日本政策金融公庫', '日本貿易保険', '東京都中小企業振興公社', '外務省', 'JCCIPI', '国土交通省']

export default function SourceIndex() {
  const [open, setOpen] = useState(false)
  const groups = SOURCES.reduce((acc, s) => { (acc[s.publisher] ||= []).push(s); return acc }, {})
  const keys = Object.keys(groups).sort((a, b) => {
    const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, 'ja')
  })
  const p1 = SOURCES.filter(s => s.priority === 1).length
  return (
    <section className="index">
      <button type="button" className="index-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {open ? '閉じる' : '登録されている資料一覧を見る'}
        <small>{SOURCES.length} 件（最初に読むもの {p1} 件）</small>
      </button>
      {open && keys.map(k => (
        <div className="index-group" key={k}>
          <h4>{k}<small>{groups[k].length}</small></h4>
          <ul>
            {groups[k].sort((a, b) => a.priority - b.priority).map(s => (
              <li key={s.id} className={s.priority === 1 ? 'p1' : ''}>
                <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
                <span className="chip">{s.type}</span>
                {s.priority === 1 && <span className="chip first">最初に読む</span>}
                {!s.url_verified && <span className="unv">URL要確認</span>}
                <div className="for">{s.why}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
