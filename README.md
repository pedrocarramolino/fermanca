# Fermança

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

## Recordatorios y avisos de fase (Web Push)

Los recordatorios y los avisos de fin de fase se entregan como notificaciones push reales (no
"locales" en el sentido estricto — no existe esa API fiable multiplataforma en la web), para que
lleguen aunque el navegador esté cerrado o el móvil bloqueado. Piezas:

- `src/app/sw.ts` — maneja los eventos `push` y `notificationclick`.
- **QStash (Upstash)** sustituye a cualquier cron por sondeo: en vez de preguntar cada minuto "¿ya
  toca?", se programa una llamada que QStash entrega en el instante exacto.
  - `src/core/infrastructure/qstash/client.ts` — programa el mensaje diferido de fin de fase
    (`scheduleSessionPhaseAlert`, se dispara solo una vez, delay = duración planeada del bloque) y
    el Schedule cron-recurrente de cada recordatorio (`createReminderSchedule`, con
    `CRON_TZ=<zona>` embebido en la expresión para respetar la hora local del usuario).
  - `src/app/api/qstash/session-phase-alert/route.ts` y `src/app/api/qstash/reminder-alert/route.ts`
    — los webhooks que QStash invoca; verifican la firma `Upstash-Signature` con
    `src/core/infrastructure/qstash/verify.ts` en vez de un secreto estático.
  - Variables necesarias (panel de QStash → región → "Quickstart"): `QSTASH_URL`, `QSTASH_TOKEN`,
    `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, más `APP_URL` (origen público de la
    app, para que QStash sepa a qué URL llamar).
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
