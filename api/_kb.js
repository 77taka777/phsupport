// Vercel Function 側の KB ローダー（Node 18+, ESM）
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const load = (f) => JSON.parse(readFileSync(join(__dirname, '..', 'data', f), 'utf8'))

export const TOPICS = load('topics.json').topics
export const SOURCES = load('sources.json').sources
const SOURCE_MAP = Object.fromEntries(SOURCES.map(s => [s.id, s]))

const BOOST = {
  industry: {
    'manufacturing': ['ecozone', 'trade-customs', 'tax-incentives', 'labor'],
    'it-bpo': ['data-it', 'ecozone', 'labor', 'visa-expat'],
    'retail-food': ['foreign-ownership', 'market-partner', 'permits-lgu', 'ip'],
    'service': ['foreign-ownership', 'entity-setup', 'visa-expat'],
    'realestate-construction': ['real-estate', 'foreign-ownership', 'permits-lgu'],
  },
  stage: {
    'research': ['market-partner', 'public-support', 'foreign-ownership'],
    'planning': ['entity-setup', 'tax-incentives', 'ecozone', 'permits-lgu'],
    'operating': ['labor', 'tax-incentives', 'finance-fx', 'exit'],
  },
  japanBase: { no: ['entity-setup', 'public-support'] },
  employeeSize: { micro: ['public-support'], small: ['public-support'], large: ['labor', 'tax-incentives'] },
  localHiring: { yes: ['labor'] },
  remittanceToJapan: { yes: ['finance-fx', 'tax-incentives'] },
}
const normalize = s => (s || '').toLowerCase().replace(/[\s　]/g, '')

export function retrieve(query, { industry, stage, japanBase, employeeSize, localHiring, remittanceToJapan, limit = 4 } = {}) {
  const q = normalize(query)
  const scored = TOPICS.map(t => {
    let score = 0
    for (const kw of t.keywords) {
      const k = normalize(kw)
      if (k && q.includes(k)) score += k.length >= 4 ? 3 : k.length >= 2 ? 2 : 1
    }
    if ((BOOST.industry[industry] || []).includes(t.id)) score += 1.5
    if ((BOOST.stage[stage] || []).includes(t.id)) score += 1
    if ((BOOST.japanBase[japanBase] || []).includes(t.id)) score += 1
    if ((BOOST.employeeSize[employeeSize] || []).includes(t.id)) score += 1
    if ((BOOST.localHiring[localHiring] || []).includes(t.id)) score += 1.5
    if ((BOOST.remittanceToJapan[remittanceToJapan] || []).includes(t.id)) score += 1.5
    return { t, score }
  }).sort((a, b) => b.score - a.score)
  const hit = scored.filter(s => s.score > 0)
  const topics = (hit.length ? hit : scored).slice(0, limit).map(s => s.t)
  const seen = new Set(); const sources = []
  for (const t of topics) for (const id of t.sources) {
    if (!seen.has(id) && SOURCE_MAP[id]) { seen.add(id); sources.push(SOURCE_MAP[id]) }
  }
  sources.sort((a, b) => a.priority - b.priority)
  return { topics, sources }
}

export function buildContext({ topics, sources }) {
  const t = topics.map(x => [
    `## 論点: ${x.title} (id=${x.id}${x.verify_flag ? ', 要一次資料確認' : ''})`,
    `概要: ${x.summary}`,
    `要点:\n${x.key_points.map(p => `- ${p}`).join('\n')}`,
    `関係機関: ${x.agencies.join(', ')} / 法令: ${x.laws.join(', ')}`,
    `専門家への質問例:\n${x.expert_questions.map(q => `- ${q}`).join('\n')}`,
    `参照資料id: ${x.sources.join(', ')}`,
  ].join('\n')).join('\n\n')
  const s = sources.map(x => `- id=${x.id} | ${x.title}（${x.publisher}）priority=${x.priority} | ${x.why} | ${x.url}`).join('\n')
  return `# 論点DB（照合済み）\n${t}\n\n# 資料DB（照合済み）\n${s}`
}
