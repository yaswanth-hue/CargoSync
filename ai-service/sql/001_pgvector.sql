-- Run ONCE in Supabase -> SQL Editor.
-- Uses a separate "ai" schema so Prisma never sees this table (no migration drift).

create extension if not exists vector with schema extensions;

create schema if not exists ai;

create table if not exists ai.knowledge_chunks (
  id          bigserial primary key,
  source      text        not null,           -- e.g. claims-policy.md
  chunk_index int         not null,
  content     text        not null,
  embedding   extensions.vector(768) not null, -- must match EMBED_DIM
  created_at  timestamptz not null default now(),
  unique (source, chunk_index)
);

create index if not exists knowledge_chunks_embedding_idx
  on ai.knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops);

-- Defense in depth: nobody but the database owner role can read this via the API.
alter table ai.knowledge_chunks enable row level security;

-- Troubleshooting: if you see 'type "extensions.vector" does not exist', the extension
-- was installed in another schema earlier. Find it with:
--   select extnamespace::regnamespace from pg_extension where extname = 'vector';
-- and replace "extensions" with that schema name here and in app/rag.py + scripts/ingest.py.