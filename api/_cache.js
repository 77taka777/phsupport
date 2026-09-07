// Supabase キャッシュ（任意）。GALLEARN と同じ方針：同じ質問は API を叩かない。
// テーブル: consultations(id uuid pk, key text unique, query text, industry text, stage text, result jsonb, created_at timestamptz default now())
import { createHash } from 'node:crypto'

const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_KEY
const enabled = Boolean(URL && KEY)

export function cacheKey(query, industry, stage, profile = {}) {
  return createHash('sha256').update(`${query.trim()}|${industry || ''}|${stage || ''}|${JSON.stringify(profile)}`).digest('hex')
}

async function rest(path, init = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json', ...(init.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`supabase ${res.status}`)
  return res.status === 204 ? null : res.json()
}

export async function getCached(key) {
  if (!enabled) return null
  try {
    const rows = await rest(`consultations?key=eq.${key}&select=result&limit=1`)
    return rows?.[0]?.result || null
  } catch { return null }
}

export async function putCached({ key, query, industry, stage, result }) {
  if (!enabled) return
  try {
    await rest('consultations', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key, query, industry, stage, result }),
    })
  } catch { /* キャッシュ失敗は無視 */ }
}

export async function recent(limit = 5) {
  if (!enabled) return []
  try {
    return await rest(`consultations?select=key,query,industry,stage,result,created_at&order=created_at.desc&limit=${limit}`)
  } catch { return [] }
}
