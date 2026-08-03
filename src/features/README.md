# features

Slices verticales "feature-first". Cada feature es dueña de su propio dominio, casos de uso,
adaptadores de infraestructura y componentes de presentación, y solo expone lo necesario a través
de un punto de entrada.

```
features/<feature>/
  domain/           # entidades y reglas específicas de la feature (si no son genéricas)
  application/       # casos de uso (p. ej. startSession, saveTemplate)
  infrastructure/    # repositorios concretos (Supabase, local storage)
  components/         # componentes de presentación propios de la feature
  hooks/              # hooks propios de la feature
```

Lo que es compartido por varias features (entidades genéricas, tipos, utilidades) vive en
`src/core`. Las features aún no existen: se irán creando en cada fase (sesiones, plantillas,
historial, estadísticas, rachas, recordatorios, ajustes, auth) a medida que las desarrollemos.
