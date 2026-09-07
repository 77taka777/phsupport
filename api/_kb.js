// Vercel Function 側の KB ローダー（Node 18+, ESM）
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const load = (f) => JSON.parse(readFileSync(join(__dirname, '..', 'data', f), 'utf8'))

export const TOPICS = load('topics.json').topics
export const SOURCES = load('sources.json').sources
export const PROFILE = load('profile.json').axes
const SOURCE_MAP = Object.fromEntries(SOURCES.map(s => [s.id, s]))
const normalize = s => (s || '').toLowerCase().replace(/[\s　]/g, '')

// profile = { industry, stage, jp_base, size, local_hire, remit }
export function resolveProfile(profile = {}) {
  return PROFILE.map(ax => {
    const opt = ax.options.find(o => o.id === profile[ax.id])
    return opt ? { axis: ax.id, axisLabel: ax.label, ...opt } : null
  }).filter(Boolean)
}

export function retrieve(query, profile = {}, limit = 4) {
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
    return { t, score }
  }).sort((a, b) => b.score - a.score)
  const hit = scored.filter(s => s.score > 0)
  const topics = (hit.length ? hit : scored).slice(0, limit).map(s => s.t)
  const seen = new Set(); const sources = []
  for (const t of topics) for (const id of t.sources) {
    if (!seen.has(id) && SOURCE_MAP[id]) { seen.add(id); sources.push(SOURCE_MAP[id]) }
  }
  sources.sort((a, b) => a.priority - b.priority)
  return { topics, sources, profile: picked }
}

export function buildContext({ topics, sources, profile }) {
  const p = profile.map(x => `- ${x.axisLabel}: ${x.label}${x.tune ? `\n  調整方針: ${x.tune}` : ''}`).join('\n')
  const t = topics.map(x => [
    `## 論点: ${x.title} (id=${x.id}${x.verify_flag ? ', 要一次資料確認' : ''})`,
    `概要: ${x.summary}`,
    `要点:\n${x.key_points.map(p => `- ${p}`).join('\n')}`,
    `関係機関: ${x.agencies.join(', ')} / 法令: ${x.laws.join(', ')}`,
    `専門家への質問例:\n${x.expert_questions.map(q => `- ${q}`).join('\n')}`,
    `参照資料id: ${x.sources.join(', ')}`,
  ].join('\n')).join('\n\n')
  const s = sources.map(x => `- id=${x.id} | ${x.title}（${x.publisher}）priority=${x.priority} | ${x.why} | ${x.url}`).join('\n')
  return `# 相談者プロフィールと調整方針\n${p}\n\n# 論点DB（照合済み）\n${t}\n\n# 資料DB（照合済み）\n${s}`
}
