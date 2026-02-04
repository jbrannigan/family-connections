-- Family Connections: initial schema
-- Run via Supabase dashboard SQL editor or `supabase db push`

-- ============================================================
-- ENUMS
-- ============================================================
create type relationship_type as enum (
  'biological_parent',
  'adoptive_parent',
  'step_parent',
  'spouse',
  'ex_spouse',
  'partner'
);

create type member_role as enum ('admin', 'member');

-- ============================================================
-- PROFILES (mirrors auth.users, populated via trigger)
-- ============================================================
create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url   text
);

alter table profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- FAMILY GRAPHS
-- ============================================================
create table family_graphs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users on delete cascade,
  invite_code text unique default encode(gen_random_bytes(6), 'hex'),
  created_at  timestamptz not null default now()
);

alter table family_graphs enable row level security;

-- ============================================================
-- MEMBERSHIPS
-- ============================================================
create table memberships (
  user_id    uuid not null references auth.users on delete cascade,
  graph_id   uuid not null references family_graphs on delete cascade,
  role       member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (user_id, graph_id)
);

alter table memberships enable row level security;

-- Users can see their own memberships
create policy "Users see own memberships"
  on memberships for select using (auth.uid() = user_id);

-- Admins can manage memberships in their graphs
create policy "Admins manage memberships"
  on memberships for all using (
    exists (
      select 1 from memberships m
      where m.graph_id = memberships.graph_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

-- Graph visibility: members only
create policy "Members see their graphs"
  on family_graphs for select using (
    exists (
      select 1 from memberships
      where memberships.graph_id = family_graphs.id
        and memberships.user_id = auth.uid()
    )
  );

-- Owners can update their graphs
create policy "Owners update graphs"
  on family_graphs for update using (auth.uid() = owner_id);

-- Anyone can create a graph
create policy "Authenticated users create graphs"
  on family_graphs for insert with check (auth.uid() = owner_id);

-- ============================================================
-- PERSONS
-- ============================================================
create table persons (
  id             uuid primary key default gen_random_uuid(),
  graph_id       uuid not null references family_graphs on delete cascade,
  display_name   text not null,
  pronouns       text,
  birth_date     date,
  death_date     date,
  birth_location text,
  is_incomplete  boolean not null default false,
  notes          text,
  created_by     uuid not null references auth.users,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table persons enable row level security;

create policy "Members see persons in their graphs"
  on persons for select using (
    exists (
      select 1 from memberships
      where memberships.graph_id = persons.graph_id
        and memberships.user_id = auth.uid()
    )
  );

create policy "Members insert persons"
  on persons for insert with check (
    exists (
      select 1 from memberships
      where memberships.graph_id = persons.graph_id
        and memberships.user_id = auth.uid()
    )
  );

create policy "Admins update persons"
  on persons for update using (
    exists (
      select 1 from memberships
      where memberships.graph_id = persons.graph_id
        and memberships.user_id = auth.uid()
        and memberships.role = 'admin'
    )
  );

create policy "Admins delete persons"
  on persons for delete using (
    exists (
      select 1 from memberships
      where memberships.graph_id = persons.graph_id
        and memberships.user_id = auth.uid()
        and memberships.role = 'admin'
    )
  );

create index idx_persons_graph on persons (graph_id);

-- ============================================================
-- RELATIONSHIPS
-- ============================================================
create table relationships (
  id         uuid primary key default gen_random_uuid(),
  graph_id   uuid not null references family_graphs on delete cascade,
  person_a   uuid not null references persons on delete cascade,
  person_b   uuid not null references persons on delete cascade,
  type       relationship_type not null,
  start_date date,
  end_date   date,
  created_by uuid not null references auth.users,
  created_at timestamptz not null default now(),
  -- Prevent duplicate relationships
  unique (person_a, person_b, type)
);

alter table relationships enable row level security;

create policy "Members see relationships"
  on relationships for select using (
    exists (
      select 1 from memberships
      where memberships.graph_id = relationships.graph_id
        and memberships.user_id = auth.uid()
    )
  );

create policy "Members insert relationships"
  on relationships for insert with check (
    exists (
      select 1 from memberships
      where memberships.graph_id = relationships.graph_id
        and memberships.user_id = auth.uid()
    )
  );

create policy "Admins update relationships"
  on relationships for update using (
    exists (
      select 1 from memberships
      where memberships.graph_id = relationships.graph_id
        and memberships.user_id = auth.uid()
        and memberships.role = 'admin'
    )
  );

create policy "Admins delete relationships"
  on relationships for delete using (
    exists (
      select 1 from memberships
      where memberships.graph_id = relationships.graph_id
        and memberships.user_id = auth.uid()
        and memberships.role = 'admin'
    )
  );

create index idx_relationships_graph on relationships (graph_id);
create index idx_relationships_persons on relationships (person_a, person_b);

-- ============================================================
-- STORIES
-- ============================================================
create table stories (
  id          uuid primary key default gen_random_uuid(),
  graph_id    uuid not null references family_graphs on delete cascade,
  person_id   uuid not null references persons on delete cascade,
  content     text not null,
  is_fun_fact boolean not null default false,
  author_id   uuid not null references auth.users,
  created_at  timestamptz not null default now()
);

alter table stories enable row level security;

create policy "Members see stories"
  on stories for select using (
    exists (
      select 1 from memberships
      where memberships.graph_id = stories.graph_id
        and memberships.user_id = auth.uid()
    )
  );

create policy "Members insert stories"
  on stories for insert with check (
    exists (
      select 1 from memberships
      where memberships.graph_id = stories.graph_id
        and memberships.user_id = auth.uid()
    )
  );

create policy "Authors update own stories"
  on stories for update using (auth.uid() = author_id);

create policy "Authors delete own stories"
  on stories for delete using (auth.uid() = author_id);

create index idx_stories_person on stories (person_id);
