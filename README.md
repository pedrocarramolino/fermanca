# PracticeFlow

PWA para organizar sesiones de práctica en bloques temporizados que se encadenan
automáticamente. Ver [progreso y fases del proyecto](#roadmap) más abajo.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** estricto
- **Tailwind CSS v4** + **shadcn/ui** (Base UI, preset "Nova")
- **Serwist** (Workbox) para el service worker — compilado de forma independiente con
  **esbuild**, no con el plugin de webpack (ver [`src/app/sw.ts`](src/app/sw.ts))
- ESLint (flat config) + Prettier (`prettier-plugin-tailwindcss`)

## Arquitectura

```
src/
  app/            Next.js App Router: rutas, manifest, iconos, service worker
  components/
    ui/           Primitivas de shadcn/ui (no editar a mano, se regeneran con la CLI)
    layout/       Componentes de la "app shell" (header, navegación, etc.)
  core/           Ver src/core/README.md — domain / application / infrastructure comunes
  features/       Ver src/features/README.md — slices verticales feature-first
  config/         Configuración/constantes de la app (metadatos del sitio, etc.)
  hooks/          Hooks compartidos
  lib/            Utilidades de framework (cn, helpers)
  types/          Tipos globales compartidos
```

Capas y dirección de dependencia: `presentation → application → domain`, con
`infrastructure` implementando interfaces definidas en `domain`. El dominio (`core/domain`,
y el de cada feature) es TypeScript puro, sin dependencias de React, Next.js o Supabase, para
poder reutilizarse en el futuro fuera de la música (deporte, idiomas, estudio...).

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El service worker está desactivado en
desarrollo (evita interferir con el hot-reload) y solo se registra en `npm run build && npm run start`.

Scripts disponibles:

| Script                            | Qué hace                                             |
| --------------------------------- | ---------------------------------------------------- |
| `npm run dev`                     | Servidor de desarrollo (Turbopack)                   |
| `npm run build`                   | Build de producción                                  |
| `npm run start`                   | Sirve el build de producción                         |
| `npm run typecheck`               | `tsc --noEmit`                                       |
| `npm run lint` / `lint:fix`       | ESLint                                               |
| `npm run format` / `format:check` | Prettier                                             |
| `npm run build:sw`                | Compila `src/app/sw.ts` → `public/sw.js` con esbuild |

## Recordatorios (Web Push)

Los recordatorios se entregan como notificaciones push reales (no "locales" en el sentido
estricto — no existe esa API fiable multiplataforma en la web), para que lleguen aunque el
navegador esté cerrado. Piezas:

- `src/app/sw.ts` — maneja los eventos `push` y `notificationclick`.
- `src/app/api/cron/reminders/route.ts` — comprueba qué recordatorios tocan ahora (por zona
  horaria de cada usuario) y envía el push. Protegido por `CRON_SECRET` (cabecera
  `Authorization: Bearer ...`).
- Necesita que algo llame a ese endpoint cada minuto (o cada ~5 min, la ventana de tolerancia
  de `isReminderPending` lo cubre sin duplicar envíos):
  - **GitHub Actions** (`.github/workflows/reminders-cron.yml`, gratis) — mecanismo activo por
    defecto, pedido cada minuto en modo best-effort. Configura en el repo: variable `APP_URL`
    (la URL desplegada) y secreto `CRON_SECRET_HEADER` (mismo valor que `CRON_SECRET` en Vercel).
  - **Vercel Cron** — el plan Hobby no admite cron jobs más frecuentes que uno al día, así que
    `vercel.json` no define ninguno. Con Vercel Pro puedes añadir un `crons` con `* * * * *` en
    `vercel.json` y desactivar el workflow de GitHub Actions si prefieres esa vía.
- **iPhone/Safari**: solo recibe push si el usuario instala la PWA en la pantalla de inicio
  primero — es una restricción de iOS, no de esta app.

## Personalización

`/settings` centraliza los ajustes de `user_settings` (tabla ya creada desde la Fase 2):
tema claro/oscuro/sistema, color de acento, sonido y volumen del temporizador, vibración y
duración del aviso visual al cambiar de bloque.

- **Tema**: sincronizado con la BBDD (`user_settings.theme`), no solo en `localStorage` — viaja
  entre dispositivos del mismo usuario. `src/app/layout.tsx` lee la sesión en cada petición y
  pasa el tema guardado como `defaultTheme` a `next-themes`, sin parpadeo.
- **Color de acento**: paletas predefinidas (`src/features/settings/lib/accent-presets.ts`), no
  un selector de color libre — todas usan la misma fórmula OKLCH (L/C) que el teal por defecto
  y solo cambian el matiz, así que el contraste ya validado se mantiene igual en cualquiera. Se
  aplica con un `<style>` inyectado en el `<head>` desde el layout raíz (Server Component), para
  que no haya parpadeo al navegar.
- **Sonido/volumen/vibración/aviso visual**: ya consumidos por el motor del temporizador desde
  la Fase 5 (`src/features/session-timer/hooks/use-session-runtime.ts`); esta fase solo añade la
  pantalla para cambiarlos.

## Roadmap

Fase 0 (esta fase) sienta la base técnica: scaffolding, arquitectura, tooling de calidad y
PWA shell mínimo. Sin funcionalidad de negocio todavía. Las siguientes fases (a confirmar en
cada paso): Design System, modelo de dominio + base de datos, autenticación, constructor de
sesión, motor de temporizador, notificaciones/sonidos, historial, plantillas, estadísticas,
rachas, recordatorios, personalización, PWA avanzada (offline/caché), pulido y despliegue.
