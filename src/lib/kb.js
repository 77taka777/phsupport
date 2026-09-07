// 論点DB・資料DBの照合ロジック（フロント側。API 落ち時のフォールバックにも使う）
import topicsData from '../../data/topics.json'
import sourcesData from '../../data/sources.json'

export const TOPICS = topicsData.topics
export const SOURCES = sourcesData.sources
const SOURCE_MAP = Object.fromEntries(SOURCES.map(s => [s.id, s]))

export const INDUSTRIES = [
  { id: 'manufacturing', label: '製造・輸出', boost: ['ecozone', 'trade-customs', 'tax-incentives', 'labor'] },
  { id: 'it-bpo', label: 'IT・BPO・オフショア', boost: ['data-it', 'ecozone', 'labor', 'visa-expat'] },
  { id: 'retail-food', label: '小売・飲食・消費財', boost: ['foreign-ownership', 'market-partner', 'permits-lgu', 'ip'] },
  { id: 'service', label: 'サービス・コンサル・教育', boost: ['foreign-ownership', 'entity-setup', 'visa-expat'] },
  { id: 'realestate-construction', label: '不動産・建設・インフラ', boost: ['real-estate', 'foreign-ownership', 'permits-lgu'] },
  { id: 'other', label: 'その他・未定', boost: [] },
]

export const STAGES = [
  { id: 'research', label: '情報収集・検討中', boost: ['market-partner', 'public-support', 'foreign-ownership'] },
  { id: 'planning', label: 'F/S・設立準備中', boost: ['entity-setup', 'tax-incentives', 'ecozone', 'permits-lgu'] },
  { id: 'operating', label: '進出済み・運営中', boost: ['labor', 'tax-incentives', 'finance-fx', 'exit'] },
]

const normalize = s => (s || '').toLowerCase().replace(/[\s　]/g, '')

export function matchTopics(query, { industry, stage, limit = 4 } = {}) {
  const q = normalize(query)
  const ind = INDUSTRIES.find(i => i.id === industry)
  const st = STAGES.find(s => s.id === stage)
  const scored = TOPICS.map(t => {
    let score = 0
    const hits = []
    for (const kw of t.keywords) {
      const k = normalize(kw)
      if (k && q.includes(k)) { score += k.length >= 4 ? 3 : k.length >= 2 ? 2 : 1; hits.push(kw) }
    }
    if (ind?.boost.includes(t.id)) score += 1.5
    if (st?.boost.includes(t.id)) score += 1
    return { topic: t, score, hits }
  })
  const ranked = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score)
  return (ranked.length ? ranked : scored.sort((a, b) => b.score - a.score)).slice(0, limit)
}

export function sourcesFor(topics) {
  const seen = new Set(); const out = []
  for (const t of topics) for (const id of t.sources) {
    if (!seen.has(id) && SOURCE_MAP[id]) { seen.add(id); out.push(SOURCE_MAP[id]) }
  }
  return out.sort((a, b) => a.priority - b.priority)
}

export function buildFallback(query, opts) {
  const topics = matchTopics(query, opts).map(m => m.topic)
  const sources = sourcesFor(topics)
  return {
    mode: 'kb-only',
    headline: topics.length
      ? `まず見るのは「${topics[0].title}」。関連 ${topics.length} 論点・資料 ${sources.length} 件。`
      : '該当する論点が見つからなかった。困りごとをもう少し具体的に書いてみて。',
    summary: topics.map(t => t.summary).join('\n'),
    topics: topics.map(t => ({
      id: t.id, title: t.title, summary: t.summary,
      key_points: t.key_points, agencies: t.agencies, laws: t.laws, verify_flag: t.verify_flag,
    })),
    sources: sources.map(s => ({ id: s.id, title: s.title, publisher: s.publisher, url: s.url, priority: s.priority, why: s.why, url_verified: s.url_verified })),
    questions: topics.flatMap(t => t.expert_questions.map(q => ({ topic: t.title, q }))),
    next_actions: [
      '上の資料を priority 1 から読む（JETRO 解説 + JBIC 投資環境）',
      '「専門家に聞くこと」を持って JETRO 貿易投資相談（無料）へ',
      '法令・数値は一次資料（BOI/PEZA/BIR/DOLE）で日付を確認',
    ],
  }
}
