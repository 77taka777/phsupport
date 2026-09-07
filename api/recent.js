import { recent } from './_cache.js'
export default async function handler(req, res) {
  const rows = await recent(5)
  res.status(200).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ items: rows }))
}
