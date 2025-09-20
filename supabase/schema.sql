-- Projects a user generates
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'Untitled Project',
  prompt text not null,
  html text not null,
  theme jsonb not null default '{}',
  blocks jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Version history per project
create table if not exists project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid not null,
  label text not null default 'v1',
  html text not null,
  created_at timestamp with time zone default now()
);

-- Anonymous (or authed) feedback from the UI
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  message text not null,
  meta jsonb not null default '{}',
  created_at timestamp with time zone default now()
);

-- Contact form submissions from generated sites (optional)
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  user_id uuid,
  name text,
  email text,
  message text,
  created_at timestamp with time zone default now()
);

-- Helpful indexes
create index if not exists idx_projects_user on projects(user_id);
create index if not exists idx_versions_project on project_versions(project_id);
