-- TAMTAM Database Schema
-- Run this in Supabase SQL Editor

-- USERS
create table users (
  id uuid references auth.users primary key,
  role text check (role in ('echo', 'batteur', 'admin')) not null,
  name text not null,
  phone text,
  city text,
  mobile_money_provider text check (mobile_money_provider in ('wave', 'orange_money')),
  balance integer default 0,
  total_earned integer default 0,
  created_at timestamptz default now()
);

-- CAMPAIGNS (Rythmes)
create table campaigns (
  id uuid default gen_random_uuid() primary key,
  batteur_id uuid references users(id) not null,
  title text not null,
  description text,
  destination_url text not null,
  creative_urls text[] default '{}',
  cpc integer not null,
  budget integer not null,
  spent integer default 0,
  status text check (status in ('draft', 'active', 'paused', 'completed')) default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now()
);

-- TRACKED LINKS
create table tracked_links (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references campaigns(id) not null,
  echo_id uuid references users(id) not null,
  short_code text unique not null,
  click_count integer default 0,
  created_at timestamptz default now(),
  unique(campaign_id, echo_id)
);

-- CLICKS
create table clicks (
  id uuid default gen_random_uuid() primary key,
  link_id uuid references tracked_links(id) not null,
  ip_address text,
  user_agent text,
  is_valid boolean default true,
  country text,
  created_at timestamptz default now()
);

-- PAYOUTS
create table payouts (
  id uuid default gen_random_uuid() primary key,
  echo_id uuid references users(id) not null,
  amount integer not null,
  provider text check (provider in ('wave', 'orange_money')),
  status text check (status in ('pending', 'sent', 'failed')) default 'pending',
  created_at timestamptz default now()
);

-- INDEXES for performance
create index idx_tracked_links_short_code on tracked_links(short_code);
create index idx_clicks_link_id on clicks(link_id);
create index idx_clicks_created_at on clicks(created_at);
create index idx_clicks_ip_link on clicks(ip_address, link_id);
create index idx_campaigns_status on campaigns(status);
create index idx_campaigns_batteur on campaigns(batteur_id);
create index idx_payouts_echo on payouts(echo_id);
create index idx_payouts_status on payouts(status);

-- RPC: Atomic click increment (prevents race conditions)
create or replace function increment_click(
  p_link_id uuid,
  p_campaign_id uuid,
  p_echo_id uuid,
  p_cpc integer,
  p_echo_earnings integer
) returns void as $$
begin
  update tracked_links set click_count = click_count + 1 where id = p_link_id;
  update campaigns set spent = spent + p_cpc where id = p_campaign_id;
  update users set balance = balance + p_echo_earnings, total_earned = total_earned + p_echo_earnings where id = p_echo_id;

  -- Auto-complete campaign if budget exhausted
  update campaigns set status = 'completed' where id = p_campaign_id and spent >= budget;
end;
$$ language plpgsql security definer;

-- RPC: Process payout
create or replace function process_payout(
  p_payout_id uuid,
  p_status text
) returns void as $$
declare
  v_echo_id uuid;
  v_amount integer;
begin
  select echo_id, amount into v_echo_id, v_amount
  from payouts where id = p_payout_id and status = 'pending';

  if not found then
    raise exception 'Payout not found or not pending';
  end if;

  update payouts set status = p_status where id = p_payout_id;

  if p_status = 'sent' then
    update users set balance = balance - v_amount where id = v_echo_id;
  end if;
end;
$$ language plpgsql security definer;

-- ROW LEVEL SECURITY
alter table users enable row level security;
alter table campaigns enable row level security;
alter table tracked_links enable row level security;
alter table clicks enable row level security;
alter table payouts enable row level security;

-- Users: read own data
create policy "Users can read own data" on users for select using (auth.uid() = id);
create policy "Users can update own data" on users for update using (auth.uid() = id);

-- Campaigns: échos see active, batteurs manage own
create policy "Anyone can read active campaigns" on campaigns for select using (status = 'active');
create policy "Batteurs read own campaigns" on campaigns for select using (batteur_id = auth.uid());
create policy "Batteurs create campaigns" on campaigns for insert with check (batteur_id = auth.uid());
create policy "Batteurs update own campaigns" on campaigns for update using (batteur_id = auth.uid());

-- Tracked links: échos manage own
create policy "Echos read own links" on tracked_links for select using (echo_id = auth.uid());
create policy "Echos create links" on tracked_links for insert with check (echo_id = auth.uid());

-- Clicks: readable by link owner
create policy "Link owners read clicks" on clicks for select
  using (link_id in (select id from tracked_links where echo_id = auth.uid()));

-- Payouts: échos manage own
create policy "Echos read own payouts" on payouts for select using (echo_id = auth.uid());
create policy "Echos request payouts" on payouts for insert with check (echo_id = auth.uid());

-- Admin policies (using service role key bypasses RLS, but adding explicit admin policies)
create policy "Admin full access users" on users for all using (
  auth.uid() in (select id from users where role = 'admin')
);
create policy "Admin full access campaigns" on campaigns for all using (
  auth.uid() in (select id from users where role = 'admin')
);
create policy "Admin full access tracked_links" on tracked_links for all using (
  auth.uid() in (select id from users where role = 'admin')
);
create policy "Admin full access clicks" on clicks for all using (
  auth.uid() in (select id from users where role = 'admin')
);
create policy "Admin full access payouts" on payouts for all using (
  auth.uid() in (select id from users where role = 'admin')
);

-- Storage bucket for campaign creatives
insert into storage.buckets (id, name, public) values ('creatives', 'creatives', true);

create policy "Anyone can read creatives" on storage.objects for select using (bucket_id = 'creatives');
create policy "Authenticated users upload creatives" on storage.objects for insert with check (bucket_id = 'creatives' and auth.role() = 'authenticated');
