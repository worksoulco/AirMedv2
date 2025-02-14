/*
  # Initial Schema Setup for AirMed

  1. Core Tables
    - profiles: User profiles for both patients and providers
    - patient_providers: Relationship between patients and providers
    - invites: Provider-generated invites for patients

  2. Health Data
    - check_ins: Daily patient check-ins for mood, sleep, etc.
    - lab_results: Patient lab test results
    - meals: Patient meal tracking

  3. Protocol Management
    - protocols: Treatment and care protocols
    - protocol_tasks: Individual tasks within protocols
    - protocol_attachments: Files and documents attached to protocols

  4. Communication
    - chat_threads: Message threads between patients and providers
    - chat_messages: Individual messages within threads
    - chat_attachments: Files attached to messages

  5. Security
    - RLS policies for each table
    - Secure data access patterns
*/

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. Core Tables

-- Profiles table for both patients and providers
create table public.profiles (
  id uuid references auth.users primary key,
  role text not null check (role in ('patient', 'provider')),
  name text not null,
  email text not null unique,
  phone text,
  photo_url text,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other')),
  address text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Provider-specific details
create table public.provider_details (
  provider_id uuid primary key references public.profiles(id),
  title text not null,
  specialties text[] default array[]::text[],
  npi text unique,
  facility_name text,
  facility_address text,
  facility_phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Patient-Provider relationships
create table public.patient_providers (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references public.profiles(id),
  provider_id uuid references public.profiles(id),
  status text not null check (status in ('active', 'pending', 'inactive')),
  connected_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(patient_id, provider_id)
);

-- Provider invites for patients
create table public.invites (
  id uuid primary key default uuid_generate_v4(),
  provider_id uuid references public.profiles(id) not null,
  email text not null,
  code text not null unique,
  status text not null check (status in ('pending', 'accepted', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Health Data

-- Daily check-ins
create table public.check_ins (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references public.profiles(id) not null,
  date date not null,
  mood text not null,
  sleep integer check (sleep between 1 and 5),
  stress integer check (stress between 1 and 5),
  energy integer check (energy between 1 and 5),
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(patient_id, date)
);

-- Lab results
create table public.lab_results (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references public.profiles(id) not null,
  provider_id uuid references public.profiles(id) not null,
  name text not null,
  value numeric not null,
  unit text not null,
  reference_range text not null,
  status text not null check (status in ('normal', 'high', 'low')),
  category text not null,
  date timestamptz not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Meal tracking
create table public.meals (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references public.profiles(id) not null,
  type text not null check (type in ('breakfast', 'lunch', 'dinner', 'snack')),
  date date not null,
  time time not null,
  notes text,
  photo_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 3. Protocol Management

-- Protocols
create table public.protocols (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  type text not null check (type in ('treatment', 'recovery', 'maintenance', 'preventive')),
  status text not null check (status in ('active', 'completed', 'archived')),
  provider_id uuid references public.profiles(id) not null,
  patient_id uuid references public.profiles(id) not null,
  start_date date not null,
  end_date date,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Protocol tasks
create table public.protocol_tasks (
  id uuid primary key default uuid_generate_v4(),
  protocol_id uuid references public.protocols(id) on delete cascade,
  title text not null,
  description text,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'as_needed')),
  status text not null check (status in ('pending', 'in_progress', 'completed')),
  due_date date,
  completed_date timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Protocol attachments
create table public.protocol_attachments (
  id uuid primary key default uuid_generate_v4(),
  protocol_id uuid references public.protocols(id) on delete cascade,
  name text not null,
  url text not null,
  type text not null,
  size integer not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 4. Communication

-- Chat threads
create table public.chat_threads (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('direct', 'group')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Thread participants
create table public.chat_participants (
  thread_id uuid references public.chat_threads(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  unread_count integer default 0,
  last_read_at timestamptz,
  created_at timestamptz default now(),
  primary key (thread_id, user_id)
);

-- Chat messages
create table public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid references public.chat_threads(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Message attachments
create table public.chat_attachments (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid references public.chat_messages(id) on delete cascade,
  name text not null,
  url text not null,
  type text not null,
  size integer not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 5. Security Policies

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.provider_details enable row level security;
alter table public.patient_providers enable row level security;
alter table public.invites enable row level security;
alter table public.check_ins enable row level security;
alter table public.lab_results enable row level security;
alter table public.meals enable row level security;
alter table public.protocols enable row level security;
alter table public.protocol_tasks enable row level security;
alter table public.protocol_attachments enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_attachments enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Provider details policies
create policy "Providers can view own details"
  on provider_details for select
  using (auth.uid() = provider_id);

create policy "Providers can update own details"
  on provider_details for update
  using (auth.uid() = provider_id);

-- Patient-Provider relationship policies
create policy "Users can view own relationships"
  on patient_providers for select
  using (auth.uid() = patient_id or auth.uid() = provider_id);

-- Invites policies
create policy "Providers can create and view own invites"
  on invites for all
  using (auth.uid() = provider_id);

-- Check-ins policies
create policy "Patients can manage own check-ins"
  on check_ins for all
  using (auth.uid() = patient_id);

create policy "Providers can view patient check-ins"
  on check_ins for select
  using (
    exists (
      select 1 from patient_providers
      where provider_id = auth.uid()
      and patient_id = check_ins.patient_id
      and status = 'active'
    )
  );

-- Lab results policies
create policy "Patients can view own lab results"
  on lab_results for select
  using (auth.uid() = patient_id);

create policy "Providers can manage patient lab results"
  on lab_results for all
  using (auth.uid() = provider_id);

-- Meals policies
create policy "Patients can manage own meals"
  on meals for all
  using (auth.uid() = patient_id);

create policy "Providers can view patient meals"
  on meals for select
  using (
    exists (
      select 1 from patient_providers
      where provider_id = auth.uid()
      and patient_id = meals.patient_id
      and status = 'active'
    )
  );

-- Protocols policies
create policy "Patients can view own protocols"
  on protocols for select
  using (auth.uid() = patient_id);

create policy "Providers can manage protocols they created"
  on protocols for all
  using (auth.uid() = provider_id);

-- Protocol tasks inherit protocol access
create policy "Protocol tasks inherit protocol access"
  on protocol_tasks for all
  using (
    exists (
      select 1 from protocols
      where id = protocol_tasks.protocol_id
      and (provider_id = auth.uid() or patient_id = auth.uid())
    )
  );

-- Protocol attachments inherit protocol access
create policy "Protocol attachments inherit protocol access"
  on protocol_attachments for all
  using (
    exists (
      select 1 from protocols
      where id = protocol_attachments.protocol_id
      and (provider_id = auth.uid() or patient_id = auth.uid())
    )
  );

-- Chat policies
create policy "Users can view their chat threads"
  on chat_threads for select
  using (
    exists (
      select 1 from chat_participants
      where thread_id = chat_threads.id
      and user_id = auth.uid()
    )
  );

create policy "Users can view messages in their threads"
  on chat_messages for select
  using (
    exists (
      select 1 from chat_participants
      where thread_id = chat_messages.thread_id
      and user_id = auth.uid()
    )
  );

create policy "Users can send messages in their threads"
  on chat_messages for insert
  with check (
    exists (
      select 1 from chat_participants
      where thread_id = chat_messages.thread_id
      and user_id = auth.uid()
    )
  );

-- Chat attachments inherit message access
create policy "Chat attachments inherit message access"
  on chat_attachments for all
  using (
    exists (
      select 1 from chat_messages m
      join chat_participants p on p.thread_id = m.thread_id
      where m.id = chat_attachments.message_id
      and p.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
create index idx_patient_providers_patient_id on patient_providers(patient_id);
create index idx_patient_providers_provider_id on patient_providers(provider_id);
create index idx_check_ins_patient_id_date on check_ins(patient_id, date);
create index idx_lab_results_patient_id on lab_results(patient_id);
create index idx_lab_results_provider_id on lab_results(provider_id);
create index idx_protocols_patient_id on protocols(patient_id);
create index idx_protocols_provider_id on protocols(provider_id);
create index idx_chat_messages_thread_id on chat_messages(thread_id);
create index idx_chat_participants_user_id on chat_participants(user_id);