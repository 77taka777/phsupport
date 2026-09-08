// 論点DB・資料DB・プロフィール軸の照合ロジック（フロント側。API 落ち時のフォールバックにも使う）
import topicsData from '../../data/topics.json'
import sourcesData from '../../data/sources.json'
import profileData from '../../data/profile.json'

export const TOPICS = topicsData.topics
export const SOURCES = sourcesData.sources
export const PROFILE_AXES = profileData.axes
const SOURCE_MAP = Object.fromEntries(SOURCES.map(s => [s.id, s]))
const normalize = s => (s || '').toLowerCase().replace(/[\s　]/g, '')

export const DEFAULT_PROFILE = { industry: 'other', stage: 'research', jp_base: 'yes', size: 'm', local_hire: 'tbd', remit: 'tbd' }

export function resolveProfile(profile = {}) {
  return PROFILE_AXES.map(ax => {
    const opt = ax.options.find(o => o.id === profile[ax.id])
    return opt ? { axis: ax.id, axisLabel: ax.label, ...opt } : null
  }).filter(Boolean)
}

export function matchTopics(query, profile = {}, limit = 4) {
  const q = normalize(query)
  const picked = resolveProfile(profile)
  const boost = {}
  for (const p of picked) for (const id of p.boost) boost[id] = (boost[id] || 0) + (p.axis === 'industry' ? 1.5 : 1)
  const scored = TOPICS.map(t => {
    let score = 0
    for (const kw of t.keywords) {
      const k = normalize(kw)
      if (k && q.includes(k)) score += k.length >= 4 ? 3 : k.length >= 2 ? 2 : 1
    }
    score += boost[t.id] || 0
    return { topic: t, score }
  })
  const ranked = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score)
  return { matches: (ranked.length ? ranked : scored.sort((a, b) => b.score - a.score)).slice(0, limit), profile: picked }
}

export function sourcesFor(topics) {
  const seen = new Set(); const out = []
  for (const t of topics) for (const id of t.sources) {
    if (!seen.has(id) && SOURCE_MAP[id]) { seen.add(id); out.push(SOURCE_MAP[id]) }
  }
  return out.sort((a, b) => a.priority - b.priority)
}

const pickSrc = s => ({ id: s.id, title: s.title, publisher: s.publisher, url: s.url, priority: s.priority, why: s.why, url_verified: s.url_verified })

export function buildFallback(query, profile) {
  const { matches, profile: picked } = matchTopics(query, profile)
  const topics = matches.map(m => m.topic)
  const sources = sourcesFor(topics)
  // 注意すべき論点5つ: 上位論点から順に要点の1行目を拾い、足りなければ2行目へ
  const top5 = []
  for (let depth = 0; top5.length < 5 && depth < 3; depth++)
    for (const t of topics) { const c = t.cautions?.[depth]; if (c && top5.length < 5) top5.push(c) }
  return {
    mode: 'kb-only',
    top5,
    headline: topics.length
      ? `まず見るのは「${topics[0].title}」。関連 ${topics.length} 論点・資料 ${sources.length} 件。`
      : '該当する論点が見つからなかった。困りごとをもう少し具体的に書いてみて。',
    summary: topics.map(t => t.summary).join('\n'),
    kb: {
      profile: picked.map(p => ({ axis: p.axis, axisLabel: p.axisLabel, label: p.label, tune: p.tune })),
      topics: topics.map(t => ({ id: t.id, title: t.title, summary: t.summary, key_points: t.key_points, agencies: t.agencies, laws: t.laws, verify_flag: t.verify_flag })),
      sources: sources.map(pickSrc),
    },
    questions: topics.flatMap(t => t.expert_questions.map(q => ({ topic: t.title, q }))),
    profile_notes: picked.filter(p => p.tune).map(p => `${p.axisLabel}＝${p.label}：${p.tune}`),
    references: sources.map(pickSrc),
    next_actions: [
      '上の資料を priority 1 から読む（JETRO 解説 + JBIC 投資環境）',
      '「専門家に聞くこと」を持って JETRO 貿易投資相談（無料）へ',
      '法令・数値は一次資料（BOI/PEZA/BIR/DOLE）で日付を確認',
    ],
  }
}
