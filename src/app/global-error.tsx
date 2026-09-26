"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/error-reporting/report-client-error";

/**
 * Último recurso: sustituye al layout raíz entero cuando el que falla es el
 * propio layout, así que no tiene ni estilos globales, ni tema, ni
 * traducciones — de ahí los estilos en línea y el texto fijo. Es el fallo
 * más grave que puede ver alguien (la app no carga), así que también avisa.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
    reportClientError(error, "global");
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 32,
          textAlign: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#fff",
          color: "#111",
        }}
      >
        <title>Fermança</title>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Algo ha ido mal</h1>
        <p style={{ margin: 0, fontSize: 14, color: "#666", maxWidth: 360 }}>
          Ha ocurrido un error inesperado y ya nos ha llegado el aviso. Prueba a recargar la página.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "#0B3B32",
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Recargar
        </button>
      </body>
    </html>
  );
}
