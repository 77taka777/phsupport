// POST /api/consult  { query, industry, stage }
// 1) KB照合 → 2) Supabaseキャッシュ → 3) Claude で「何を見ればいいか」を構造化 → 4) 失敗時は KB のみで返す
import { retrieve, buildContext, SOURCES } from './_kb.js'
import { cacheKey, getCached, putCached } from './_cache.js'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

const SYSTEM = `あなたは日本企業のフィリピン進出を20年支援してきた実務コンサルタント（税務・労務・法務・立地に横断的に精通）。
相談者は「これからフィリピンに進出する企業の担当者」で、専門知識は無い。
あなたの仕事は「答えを出す」ことではなく、「何を見ればいいか」「誰に何を聞けばいいか」を整理して渡すこと。

必ず守ること:
- 提供された論点DB・資料DBの範囲で答え、DBに無い法令名・数値・URLを創作しない。
- 数値・法令は変わりやすい。要点には「要確認」を付け、一次資料で確認するよう促す。
- 相談者の困りごとを、専門家目線で「本当の論点」に翻訳する（例:「人を雇いたい」→ 労務+ビザ+社会保険+最低賃金）。
- 「相談者プロフィールと調整方針」に必ず従い、その相談者に当てはまらない論点・資料は落とし、当てはまるものは具体化する（例: 日本拠点なし→支店・駐在員事務所を勧めない／現地雇用なし→労務は後回しにしてビザを前に／送金あり→BSP登録と租税条約を必ず入れる／〜10人→中小機構・JICA中小支援を入れ、15名雇用の資本緩和は勧めない）。
- 専門用語は初出で一言説明（例: 事業性調査（F/S）、PEZA（輸出企業向けの経済特区庁））。
- 使った資料は references に全て列挙する（reading_order に載せなかったものも）。
- 日本語。文体は簡潔・断定的。敬語は最小限。
- 出力は JSON のみ。前置き・コードフェンス禁止。

JSON スキーマ:
{
  "headline": "1文。この困りごとで最初に見るべきもの",
  "reframe": "困りごとを専門家の論点に言い換えた2〜4文",
  "topics": [{ "id": "論点id", "title": "", "why_now": "この相談者にとってなぜ今この論点か（1〜2文）", "watch_out": "見落としがちな落とし穴（1文）" }],
  "reading_order": [{ "source_id": "資料id", "title": "", "publisher": "", "url": "", "read_for": "この資料で何を確認するか（1文）" }],
  "questions": [{ "to": "誰に（JETRO相談員/現地会計事務所/現地弁護士/PEZA/現地人事コンサル 等）", "q": "そのまま口に出せる質問文" }],
  "next_actions": ["今週やること 3〜5個、動詞から始める"],
  "profile_notes": ["相談者の選択（日本拠点・規模・現地雇用・送金）を踏まえて回答をどう調整したか、1項目1文で2〜5個"],
  "references": [{ "source_id": "資料id", "title": "", "publisher": "", "url": "" }],
  "confidence_note": "DBの網羅性と要確認事項についての一言"
}
reading_order は priority 順で最大6件。questions は最大8件、相談者の状況に合わせて具体化する。`

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const { query = '', industry = '', stage = '', jp_base = '', size = '', local_hire = '', remit = '' } = body || {}
  if (!query.trim()) return json(res, 400, { error: 'query is required' })
  const profileIn = { industry, stage, jp_base, size, local_hire, remit }

  const { topics, sources, profile } = retrieve(query, profileIn)
  const kb = {
    profile: profile.map(p => ({ axis: p.axis, axisLabel: p.axisLabel, label: p.label, tune: p.tune })),
    topics: topics.map(t => ({ id: t.id, title: t.title, summary: t.summary, key_points: t.key_points, agencies: t.agencies, laws: t.laws, verify_flag: t.verify_flag, expert_questions: t.expert_questions })),
    sources: sources.map(s => ({ id: s.id, title: s.title, publisher: s.publisher, url: s.url, priority: s.priority, why: s.why, url_verified: s.url_verified })),
  }

  const key = cacheKey(query, profileIn)
  const cached = await getCached(key)
  if (cached) return json(res, 200, { ...cached, cached: true })

  if (!process.env.ANTHROPIC_API_KEY) {
    return json(res, 200, { mode: 'kb-only', kb, note: 'ANTHROPIC_API_KEY 未設定のため KB 照合のみ' })
  }

  const user = [
    `## 困りごと`,
    query,
    ``,
    buildContext({ topics, sources, profile }),
  ].join('\n')

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL, max_tokens: 2500, temperature: 0.3,
        system: SYSTEM,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text()}`)
    const data = await r.json()
    const text = data.content.filter(c => c.type === 'text').map(c => c.text).join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    const result = { mode: 'llm', model: MODEL, ...parsed, kb }
    await putCached({ key, query, profile: profileIn, result })
    return json(res, 200, result)
  } catch (e) {
    console.error(e)
    return json(res, 200, { mode: 'kb-only', kb, note: `LLM 失敗のため KB 照合のみ: ${String(e.message).slice(0, 120)}` })
  }
}
