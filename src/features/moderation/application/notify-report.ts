import "server-only";
import { siteConfig } from "@/config/site";
import {
  escapeHtml,
  formatMadrid,
  isAdminEmailEnabled,
  sendAdminEmail,
} from "@/core/infrastructure/email/send-admin-email";
import type { ReportContext, ReportReason } from "@/features/moderation/application/constants";

const REASON_LABELS: Record<ReportReason, string> = {
  harassment: "Acoso o insultos",
  inappropriate: "Contenido inapropiado u ofensivo",
  spam: "Spam o publicidad",
  impersonation: "Se hace pasar por otra persona",
  other: "Otro motivo",
};

const CONTEXT_LABELS: Record<ReportContext, string> = {
  profile: "su perfil (lista de amigos)",
  friend_request: "una solicitud de amistad",
  session_share: "una sesión publicada en el Feed",
  weekly_goal_share: "un objetivo semanal publicado en el Feed",
  group: "un grupo",
};

/**
 * Aviso por correo de una denuncia nueva. Nunca lanza: la denuncia ya está
 * guardada en `user_reports` (y visible en /community/reports), el correo
 * es solo para enterarse antes.
 */
export async function notifyReport(report: {
  reporterUsername: string;
  reportedUsername: string;
  reason: ReportReason;
  context: ReportContext;
  details: string | null;
  openReportsAgainstUser: number;
}): Promise<void> {
  if (!isAdminEmailEnabled()) return;
  try {
    const rows: [string, string][] = [
      ["Denunciado", `@${report.reportedUsername}`],
      ["Motivo", REASON_LABELS[report.reason]],
      ["Desde", CONTEXT_LABELS[report.context]],
      ["Denuncia", `@${report.reporterUsername}`],
      ["Cuándo", `${formatMadrid(new Date())} (hora de Madrid)`],
      [
        "Abiertas",
        report.openReportsAgainstUser <= 1
          ? "Es la primera denuncia abierta contra esta persona."
          : `${report.openReportsAgainstUser} denuncias abiertas contra esta persona.`,
      ],
    ];
    const reviewUrl = `${siteConfig.url}/community/reports`;

    const text = [
      `Nueva denuncia en ${siteConfig.name}.`,
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      report.details ? `Lo que cuenta:\n${report.details}` : "(No ha añadido comentarios.)",
      "",
      `Revísala en ${reviewUrl}`,
    ].join("\n");

    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;max-width:640px">
  <h2 style="margin:0 0 12px;font-size:18px">🚩 Nueva denuncia en ${escapeHtml(siteConfig.name)}</h2>
  <table style="border-collapse:collapse;font-size:14px;width:100%">
    ${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:4px 0;word-break:break-word">${escapeHtml(value)}</td></tr>`,
      )
      .join("\n    ")}
  </table>
  ${
    report.details
      ? `<p style="margin:16px 0 4px;font-size:13px;color:#666">Lo que cuenta:</p><blockquote style="margin:0;padding:12px;background:#f5f5f5;border-radius:8px;font-size:14px;white-space:pre-wrap;word-break:break-word">${escapeHtml(report.details)}</blockquote>`
      : ""
  }
  <p style="margin:16px 0 0"><a href="${escapeHtml(reviewUrl)}" style="color:#111">Revisar las denuncias abiertas</a></p>
</div>`;

    await sendAdminEmail({
      subject: `🚩 ${siteConfig.name}: denuncia contra @${report.reportedUsername} (${REASON_LABELS[report.reason]})`,
      text,
      html,
    });
  } catch (err) {
    console.error("[moderation] No se pudo avisar de la denuncia por correo:", err);
  }
}
