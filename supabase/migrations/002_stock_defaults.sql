-- ============================================================
-- Red Ink — Stock Defaults
-- Marks selected global characters/scenarios as stock defaults.
-- ============================================================

alter table if exists characters
  add column if not exists is_stock boolean default false;

alter table if exists scenarios
  add column if not exists is_stock boolean default false;

-- Characters: Kendra, Tyson, Nick, Megan & Parker
update characters
set is_stock = true,
    is_global = true,
    user_id = null,
    updated_at = now()
where user_id is null
  and lower(regexp_replace(name, '[^a-z0-9]', '', 'g')) in (
    'kendra',
    'tyson',
    'nick',
    'meganparker'
  );

-- Scenarios: xxxPawn, The Consolation Prize, The Confession, Free-Use, SuburbanSecrets
update scenarios
set is_stock = true,
    is_global = true,
    user_id = null,
    updated_at = now()
where user_id is null
  and lower(regexp_replace(name, '[^a-z0-9]', '', 'g')) in (
    'xxxpawn',
    'theconsolationprize',
    'theconfession',
    'freeuse',
    'suburbansecrets',
    'suburbansecretscom'
  );

-- Optional hygiene: remove stock tag from non-stock globals, then ensure stock tag on stock rows.
update characters
set tags = array_remove(coalesce(tags, '{}'), 'stock')
where user_id is null and coalesce(is_stock, false) = false;

update scenarios
set tags = array_remove(coalesce(tags, '{}'), 'stock')
where user_id is null and coalesce(is_stock, false) = false;

update characters
set tags = array(
  select distinct t
  from unnest(array_append(coalesce(tags, '{}'), 'stock')) as t
)
where user_id is null and coalesce(is_stock, false) = true;

update scenarios
set tags = array(
  select distinct t
  from unnest(array_append(coalesce(tags, '{}'), 'stock')) as t
)
where user_id is null and coalesce(is_stock, false) = true;
