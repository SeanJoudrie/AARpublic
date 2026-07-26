-- AAR schema. Run in the Supabase SQL editor (or `supabase db push`).
-- The core app works with ZERO tables — translation is stateless. This exists
-- for the "save my runs" and "semantic keyword match" stretch goals.

-- pgvector for semantic similarity between résumé lines and JD requirements.
create extension if not exists vector;

-- One saved translation run.
create table if not exists public.runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  resume       text not null,
  job_desc     text not null,
  match_score  int  not null check (match_score between 0 and 100),
  -- The full TranslateResult JSON, so a run can be re-rendered as-is.
  result       jsonb not null
);

create index if not exists runs_user_created_idx
  on public.runs (user_id, created_at desc);

-- Optional: embeddings for JD requirements, to power semantic keyword matching
-- (find résumé evidence for a requirement even when the wording differs).
-- 1536 dims matches OpenAI text-embedding-3-small; change to match your model.
create table if not exists public.requirement_embeddings (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid references public.runs (id) on delete cascade,
  keyword    text not null,
  embedding  vector(1536) not null
);

create index if not exists requirement_embeddings_ivfflat
  on public.requirement_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ── Rate limiting ────────────────────────────────────────────────────────────
-- Fixed-window IP limiter, called by the translate edge function before it
-- spends a Claude request. Keeps the function from becoming an open, bill-
-- draining proxy. Uses SECURITY DEFINER so the function can be called with the
-- service-role key from the edge runtime only.
create table if not exists public.rate_limit (
  ip           text        not null,
  window_start timestamptz not null,
  count        int         not null default 0,
  primary key (ip, window_start)
);

create or replace function public.check_rate_limit(
  p_ip text,
  p_max int,
  p_window_secs int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_secs) * p_window_secs);
  c int;
begin
  insert into public.rate_limit (ip, window_start, count)
  values (p_ip, w, 1)
  on conflict (ip, window_start)
    do update set count = public.rate_limit.count + 1
  returning count into c;

  -- Opportunistic cleanup so the table can't grow unbounded.
  delete from public.rate_limit where window_start < now() - interval '1 day';

  return c <= p_max;
end;
$$;

-- Row-level security: a user sees only their own runs.
alter table public.runs enable row level security;

drop policy if exists "own runs" on public.runs;
create policy "own runs" on public.runs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
