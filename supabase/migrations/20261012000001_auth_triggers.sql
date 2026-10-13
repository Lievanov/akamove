-- Not captured by the public-schema dump: the trigger on auth.users that
-- creates a profile for every new sign-up (api/db/migrations/000).
create trigger on_auth_user_created
after insert on auth.users for each row
execute procedure public.handle_new_user ();
