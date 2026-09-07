-- PHsupport: 相談結果キャッシュ
create table if not exists consultations (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,           -- sha256(query|industry|stage|追加条件)
  query text not null,
  industry text,
  stage text,
  result jsonb not null,
  created_at timestamptz default now()
);
create index if not exists consultations_created_at_idx on consultations (created_at desc);
