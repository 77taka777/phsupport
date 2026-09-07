// KB 整合性チェック: topics.sources の id が sources.json に存在するか / 重複 id
import { readFileSync } from 'node:fs'
const topics = JSON.parse(readFileSync('data/topics.json', 'utf8')).topics
const sources = JSON.parse(readFileSync('data/sources.json', 'utf8')).sources
const ids = new Set(sources.map(s => s.id))
let bad = 0
for (const t of topics) for (const s of t.sources) if (!ids.has(s)) { console.error(`✗ ${t.id} → 未定義 source: ${s}`); bad++ }
const dup = sources.map(s => s.id).filter((v, i, a) => a.indexOf(v) !== i)
if (dup.length) { console.error('✗ 重複 source id:', dup); bad++ }
console.log(`topics=${topics.length} sources=${sources.length} unverified_urls=${sources.filter(s => !s.url_verified).length}`)
process.exit(bad ? 1 : 0)
