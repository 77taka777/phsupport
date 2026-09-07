// GET /api/sources — KB に登録されている資料一覧（UIの「資料一覧」用。フロントは data/ を直接持つので予備）
import { SOURCES } from './_kb.js'
export default function handler(req, res) {
  res.status(200).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ sources: SOURCES }))
}
