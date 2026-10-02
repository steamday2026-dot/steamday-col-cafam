/* =====================================================================
   STEAM Day Cafam · Configuración
   URL y llave publicable ya configuradas. Falta VAPID_PUBLIC_KEY (paso de avisos).
   - SUPABASE_URL y SUPABASE_ANON_KEY: Supabase → Project Settings → API.
   - VAPID_PUBLIC_KEY: la clave pública generada en el paso de alertas (ver LEEME).
   La llave anon es pública por diseño; la seguridad la dan las reglas RLS.
   NUNCA pongas aquí la llave service_role.
   ===================================================================== */
window.STEAM_CONFIG = {
  SUPABASE_URL: 'https://dwpfpfrvxoujmsduihah.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_sZfrE6TH83lUeoknVz7qeQ_SKoEvuCm',
  VAPID_PUBLIC_KEY: 'TU_CLAVE_PUBLICA_VAPID',
  VERSION: 'steam-v1'
};
