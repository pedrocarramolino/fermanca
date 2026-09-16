-- Supabase concede EXECUTE por defecto a anon/authenticated en cualquier
-- función nueva del esquema public (vía ALTER DEFAULT PRIVILEGES), así que
-- el "revoke all ... from public" de la migración anterior no bastaba: solo
-- revoca el privilegio implícito del pseudo-rol PUBLIC, no esos grants
-- explícitos. email_registered() solo debe poder ejecutarla el rol de
-- servicio (se llama desde el server action de registro, nunca desde el
-- cliente) — confirmado por el advisor de seguridad tras la migración
-- anterior.
revoke execute on function public.email_registered(text) from anon, authenticated;
