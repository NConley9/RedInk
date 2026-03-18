-- Ensure only explicit stock rows remain globally public.
-- Non-stock seeded rows become non-global and are hidden from other users.

update public.characters
set is_global = false
where user_id is null
  and coalesce(is_stock, false) = false;

update public.scenarios
set is_global = false
where user_id is null
  and coalesce(is_stock, false) = false;
