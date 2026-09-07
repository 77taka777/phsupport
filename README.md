# PHsupport

**フィリピン進出、まず何を見る？** — 困りごとを入れると「見るべき資料の順番」「本当の論点」「専門家にそのまま聞ける質問」が出てくる。

[GALLEARN](https://github.com/77taka777/GALLEARN)（難しい話を、その人に合う例えに翻訳する学習システム）の設計を土台に、
「翻訳先」を *ギャルの例え* から *進出コンサルの論点* に差し替えたもの。
LLM は答えを創作しない。`data/` の論点DB・資料DB（JETRO / JBIC / JICA / フィリピン各省庁）に当てて、**どこを見ればいいか**だけを整理する。

## 何ができる

| 入力 | 出力 |
| --- | --- |
| 困りごと（自由文） | **見る順番** — priority 順の資料リスト（JETRO解説 → JBIC投資環境 → 一次資料） |
| 業種（製造 / IT-BPO / 小売飲食 / サービス / 不動産建設） | **本当の論点** — 「人を雇いたい」→ 労務 + ビザ + 社会保険 + 最低賃金 に翻訳 |
| 段階（検討 / 設立準備 / 運営中） | **専門家に聞くこと** — 誰に（JETRO相談員 / 現地会計事務所 / 現地弁護士…）× そのまま口に出せる質問文 |
| | **今週やること** — 動詞から始まる 3〜5 個 |

API キーが無くても `data/` の照合だけで動く（KB照合モード）。キーがあると Claude が相談者の状況に合わせて具体化する（専門家モード）。

## 構成（GALLEARN と同じスタック）

```
PHsupport/
├─ src/                 React + Vite（UI。API 落ちてもブラウザ内 KB 照合で動く）
│  ├─ App.jsx / components/Desk.jsx / components/Result.jsx
│  └─ lib/kb.js         論点照合ロジック（フロント用）
├─ api/                 Vercel Functions
│  ├─ consult.js        POST { query, industry, stage } → 構造化 JSON
│  ├─ recent.js         直近5件（Supabase があれば）
│  ├─ _kb.js            論点DB・資料DB ローダー & 照合
│  └─ _cache.js         Supabase キャッシュ（同じ質問は API を叩かない）
├─ data/
│  ├─ topics.json       論点DB（16論点：設立 / 外資規制 / 税制 / 労務 / ビザ / 特区 / 許認可 / 貿易 / 知財 / 不動産 / 金融 / 個人情報 / 市場 / 公的支援 / リスク / 撤退）
│  └─ sources.json      資料DB（47件：JETRO / JBIC / JICA / 中小機構 / 外務省 / BOI / PEZA / SEC / BIR / DOLE / BSP …）
├─ docs/
│  ├─ KNOWLEDGE_BASE_PLAN.md   何を DB に入れるべきか（提案と優先度）
│  └─ supabase.sql             キャッシュ用テーブル
└─ scripts/
   ├─ check_kb.mjs      DB 整合性チェック（npm run kb:check）
   └─ setup_github.sh   リポジトリ作成〜初回 push
```

## 動かす

```bash
npm install
cp .env.example .env      # ANTHROPIC_API_KEY を入れる（無くても KB モードで動く）
npm run dev               # http://localhost:5173（/api は vercel dev か本番へ）
vercel dev                # API も一緒に動かすならこっち
```

Vercel にデプロイするときは環境変数に `ANTHROPIC_API_KEY`（必須）、`SUPABASE_URL` / `SUPABASE_SERVICE_KEY`（任意）を設定。

## DB を育てる

- `data/topics.json` に論点を追加。`keywords` は相談者が実際に書きそうな口語（「人を雇いたい」「店を出したい」）を入れる。
- `data/sources.json` に資料を追加。`why`（この資料で何が分かるか）と `priority`（1=最初に読む）は必ず書く。
- `npm run kb:check` で参照切れを確認。
- `verify_flag: true` の論点、`url_verified: false` の資料は、次に触るときに一次資料で確認して更新する。

何を入れるべきかの全体像は `docs/KNOWLEDGE_BASE_PLAN.md`。

## 免責

ここに出るのは「どこを見るか」の案内。法令・数値（最低賃金、最低資本、税率、優遇期間）は変更が早い。最終判断は一次資料（BOI / PEZA / BIR / DOLE / SEC）と専門家で。
