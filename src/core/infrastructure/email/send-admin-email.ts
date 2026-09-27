import "server-only";

/**
 * Correo al administrador por Resend — lo usan los avisos de errores
 * (report-error.ts) y los de denuncias (moderation/notify-report.ts).
 *
 * Solo funciona si están RESEND_API_KEY y ERROR_ALERT_EMAIL (varias
 * direcciones separadas por comas). En Vercel existen solo para producción,
 * así que ni las previews ni el `next dev` de nadie mandan correos.
 */

const DEFAULT_FROM = "Fermança <onboarding@resend.dev>";

export function isAdminEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.ERROR_ALERT_EMAIL);
}

export async function sendAdminEmail(email: {
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.ERROR_ALERT_FROM || DEFAULT_FROM,
      to: process.env.ERROR_ALERT_EMAIL!.split(",").map((address) => address.trim()),
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`Resend respondió ${response.status}: ${await response.text()}`);
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatMadrid(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
