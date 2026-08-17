function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copia .env.local.example a .env.local y ` +
        "rellena la URL y la anon key de tu proyecto Supabase.",
    );
  }
  return value;
}

export function getSupabaseEnv() {
  // `process.env.NEXT_PUBLIC_X` en acceso literal, no `process.env[name]`: Next.js
  // solo puede inyectar variables NEXT_PUBLIC_* en el bundle del navegador cuando
  // las ve como acceso estático a una propiedad — con una clave dinámica no las
  // encuentra, así que en el cliente `process.env` llega vacío y esto explotaba
  // en cuanto algo lo llamaba de verdad desde ahí (createClient del navegador).
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}
