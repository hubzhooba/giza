-- Create rooms table for storing secure contract rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null, -- The ID used in the app
  name text not null,
  creator_id uuid references auth.users(id) on delete cascade not null,
  encryption_key text not null,
  status text not null default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.rooms enable row level security;

-- Policies for rooms
create policy "Users can view their own rooms"
  on public.rooms for select
  using (auth.uid() = creator_id);

create policy "Users can create their own rooms"
  on public.rooms for insert
  with check (auth.uid() = creator_id);

create policy "Users can update their own rooms"
  on public.rooms for update
  using (auth.uid() = creator_id);

-- Create documents table for storing contract documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null, -- The ID used in the app
  room_id uuid references public.rooms(id) on delete cascade not null,
  name text not null,
  type text,
  arweave_id text,
  encrypted_content text,
  fields jsonb,
  status text not null default 'draft',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.documents enable row level security;

-- Policies for documents
create policy "Users can view documents in their rooms"
  on public.documents for select
  using (
    exists (
      select 1 from public.rooms
      where rooms.id = documents.room_id
      and rooms.creator_id = auth.uid()
    )
  );

create policy "Users can create documents in their rooms"
  on public.documents for insert
  with check (
    exists (
      select 1 from public.rooms
      where rooms.id = documents.room_id
      and rooms.creator_id = auth.uid()
    )
  );

create policy "Users can update documents in their rooms"
  on public.documents for update
  using (
    exists (
      select 1 from public.rooms
      where rooms.id = documents.room_id
      and rooms.creator_id = auth.uid()
    )
  );

-- Create participants table for room participants
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  name text not null,
  email text,
  public_key text,
  status text not null default 'invited',
  has_joined boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.participants enable row level security;

-- Policies for participants
create policy "Users can view participants in their rooms"
  on public.participants for select
  using (
    exists (
      select 1 from public.rooms
      where rooms.id = participants.room_id
      and rooms.creator_id = auth.uid()
    )
  );

create policy "Users can manage participants in their rooms"
  on public.participants for all
  using (
    exists (
      select 1 from public.rooms
      where rooms.id = participants.room_id
      and rooms.creator_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create triggers for updated_at
create trigger rooms_updated_at before update on public.rooms
  for each row execute procedure public.handle_updated_at();

create trigger documents_updated_at before update on public.documents
  for each row execute procedure public.handle_updated_at();

create trigger participants_updated_at before update on public.participants
  for each row execute procedure public.handle_updated_at();