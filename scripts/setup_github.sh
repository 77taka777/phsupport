#!/usr/bin/env bash
# PHsupport を GitHub (77taka777) に新規作成して push する
# 前提: gh CLI にログイン済み (gh auth login)
set -euo pipefail
cd "$(dirname "$0")/.."
git init -b main 2>/dev/null || true
git add -A
git commit -m "PHsupport: フィリピン進出『何を見ればいいか』ナビ（GALLEARN 派生）" || true
gh repo create 77taka777/PHsupport --private --source=. --remote=origin --push
echo "→ https://github.com/77taka777/PHsupport"
echo "次: vercel link && vercel env add ANTHROPIC_API_KEY && vercel --prod"
