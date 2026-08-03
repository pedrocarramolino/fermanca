# core

Building blocks compartidos por toda la aplicación, independientes de cualquier feature concreta.

- **domain/** — entidades, value objects, errores de dominio e interfaces de repositorio. Sin
  dependencias de React, Next.js ni Supabase: es TypeScript puro.
- **application/** — tipos y utilidades genéricas para casos de uso (p. ej. `Result`/`Either`,
  contratos de puertos). Los casos de uso concretos de cada feature viven en
  `features/<feature>/application`.
- **infrastructure/** — piezas de infraestructura transversales (factoría del cliente de Supabase,
  wrappers de storage, etc.) que implementan interfaces definidas en `domain`.

Regla de dependencia: `presentation → application → domain`, e `infrastructure` implementa
interfaces de `domain` pero nunca al revés. El dominio no importa nada de fuera de esta carpeta.
