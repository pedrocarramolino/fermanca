# Despliegue

Guía paso a paso para desplegar PracticeFlow en producción. No sustituye a hacerlo con
cuidado la primera vez: revisa cada paso, no hay automatización mágica aquí.

## 1. Requisitos previos

- Un proyecto de Supabase con las migraciones de `supabase/migrations/` ya aplicadas (en orden,
  por nombre de archivo).
- Cuenta de Vercel (recomendado — ver por qué en el README, sección "Recordatorios").
- El repositorio en GitHub (o GitLab/Bitbucket) conectado a ese proyecto de Vercel.

## 2. Variables de entorno

Todas las de `.env.local.example`, configuradas en Vercel (Project Settings → Environment
Variables), con el mismo valor que usas en local salvo donde se indica lo contrario:

| Variable                        | Notas                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Igual que en local.                                                                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Igual que en local.                                                                                      |
| `SUPABASE_SECRET_KEY`           | Nunca la expongas en el cliente — solo `NEXT_PUBLIC_*` llega al navegador.                               |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`  | Igual que en local — si la cambias, los usuarios ya suscritos pierden el push y tendrán que reactivarlo. |
| `VAPID_PRIVATE_KEY`             | Igual que en local.                                                                                      |
| `VAPID_SUBJECT`                 | `mailto:` de contacto real.                                                                              |
| `CRON_SECRET`                   | Genera uno nuevo para producción, no reutilices el de desarrollo.                                        |

## 3. Configurar el proyecto en Vercel

1. Importa el repositorio en [vercel.com/new](https://vercel.com/new).
2. Framework preset: Next.js (autodetectado).
3. Añade las variables de entorno del paso 2.
4. Despliega.

`vercel.json` ya define el cron (`/api/cron/reminders`, cada minuto) — se activa solo al
desplegar. **En el plan Hobby, Vercel no garantiza esa frecuencia exacta**; si no tienes Pro,
usa la alternativa gratuita ya incluida: `.github/workflows/reminders-cron.yml` (cada 5 min).
Para activarla, en el repositorio de GitHub configura:

- Variable de repo (`Settings → Secrets and variables → Actions → Variables`): `APP_URL` con la
  URL desplegada (p. ej. `https://practiceflow.vercel.app`).
- Secreto (`Settings → Secrets and variables → Actions → Secrets`): `CRON_SECRET_HEADER` con el
  mismo valor que `CRON_SECRET` en Vercel.

## 4. Configurar Supabase Auth para el dominio de producción

En el panel de Supabase (Authentication → URL Configuration):

- **Site URL**: la URL de producción (p. ej. `https://practiceflow.vercel.app`).
- **Redirect URLs**: añade `https://<tu-dominio>/auth/callback` (el flujo de confirmación de
  email y de recuperación de contraseña lo necesitan).

Sin esto, los enlaces de confirmación de email/recuperación de contraseña seguirán apuntando a
`localhost` aunque la app esté en producción.

## 5. HTTPS — no es opcional

Service Worker y Web Push **solo funcionan sobre HTTPS** (o `localhost` en desarrollo). Vercel
ya sirve todo bajo HTTPS por defecto, incluido un dominio personalizado si lo configuras — no
hace falta nada adicional salvo que apuntes un dominio propio (en ese caso, verifica que el
certificado esté activo antes de probar recordatorios/instalación).

## 6. Verificación post-despliegue

- [ ] Login/registro funcionan y el email de confirmación llega con el enlace correcto (paso 4).
- [ ] `npm run build` local pasa sin errores (ya verificado en este repo).
- [ ] Instalar la PWA (banner de instalación o menú del navegador) y comprobar que abre en modo
      standalone.
- [ ] Activar notificaciones en `/recordatorios`, crear un recordatorio, y confirmar (esperando
      al cron o llamando manualmente al endpoint con el bearer token) que llega la notificación.
- [ ] Poner el dispositivo en modo avión y navegar a una ruta nunca visitada → debe verse
      `offline.html`, no el error nativo del navegador.
