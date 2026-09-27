"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import type { UserId } from "@/core/domain/ids";
import {
  REPORT_CONTEXTS,
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  type ReportContext,
  type ReportReason,
} from "@/features/moderation/application/constants";
import { notifyReport } from "@/features/moderation/application/notify-report";

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Los ids llegan del navegador y acaban dentro de filtros `.or(...)` de
 * PostgREST — cualquier cosa que no sea un uuid se rechaza aquí. */
function parseUuid(value: unknown): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) throw new Error("Id no válido.");
  return value.toLowerCase();
}

/** Ids por consulta al borrar reacciones: van en la URL, así que se trocean. */
const ID_CHUNK = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Reacciones que `reactorId` dejó en publicaciones de `ownerId`. Al dejar de
 * ser amigos ya no se ven con nombre, pero seguirían sumando en el recuento
 * de esas publicaciones (y el dueño sabría que hay "alguien" ahí). */
async function deleteReactions(
  service: ReturnType<typeof createServiceClient>,
  reactorId: UserId,
  ownerId: UserId,
) {
  const [sessionShares, goalShares] = await Promise.all([
    service.from("session_shares").select("id").eq("owner_id", ownerId),
    service.from("weekly_goal_shares").select("id").eq("owner_id", ownerId),
  ]);
  if (sessionShares.error) throw sessionShares.error;
  if (goalShares.error) throw goalShares.error;

  await Promise.all([
    ...chunk(
      sessionShares.data.map((s) => s.id),
      ID_CHUNK,
    ).map(async (ids) => {
      const { error } = await service
        .from("session_share_reactions")
        .delete()
        .eq("owner_id", reactorId)
        .in("session_share_id", ids);
      if (error) throw error;
    }),
    ...chunk(
      goalShares.data.map((s) => s.id),
      ID_CHUNK,
    ).map(async (ids) => {
      const { error } = await service
        .from("weekly_goal_share_reactions")
        .delete()
        .eq("owner_id", reactorId)
        .in("weekly_goal_share_id", ids);
      if (error) throw error;
    }),
  ]);
}

/**
 * Todo lo que une a dos personas y deja de tener sentido tras un bloqueo:
 * la amistad (o solicitud pendiente, en cualquier sentido), las invitaciones
 * a sesión que sigan pendientes y las reacciones de cada uno en las
 * publicaciones del otro. La amistad se borra con el cliente del usuario
 * (RLS deja a cualquiera de los dos); lo demás toca filas del otro, así que
 * va con la clave de servicio.
 */
async function cutTiesBetween(
  client: Awaited<ReturnType<typeof createClient>>,
  userId: UserId,
  otherId: UserId,
) {
  const service = createServiceClient();

  const friendship = await client
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`,
    );
  if (friendship.error) throw friendship.error;

  const now = new Date().toISOString();
  const [sentInvites, receivedInvites] = await Promise.all([
    service
      .from("session_invites")
      .update({ status: "cancelled", responded_at: now })
      .eq("status", "pending")
      .eq("inviter_id", userId)
      .eq("invitee_id", otherId),
    service
      .from("session_invites")
      .update({ status: "declined", responded_at: now })
      .eq("status", "pending")
      .eq("inviter_id", otherId)
      .eq("invitee_id", userId),
  ]);
  if (sentInvites.error) throw sentInvites.error;
  if (receivedInvites.error) throw receivedInvites.error;

  await Promise.all([
    deleteReactions(service, userId, otherId),
    deleteReactions(service, otherId, userId),
  ]);
}

function revalidateSocialPages() {
  revalidatePath("/community", "layout");
  revalidatePath("/feed");
  revalidatePath("/settings");
}

async function blockAsUser(
  client: Awaited<ReturnType<typeof createClient>>,
  userId: UserId,
  targetId: UserId,
) {
  if (targetId === userId) throw new Error("No puedes bloquearte a ti mismo.");
  const { error } = await client
    .from("user_blocks")
    .upsert(
      { blocker_id: userId, blocked_id: targetId },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
    );
  if (error) throw error;
  await cutTiesBetween(client, userId, targetId);
}

/**
 * Bloquear a alguien: deja de ser tu amigo, desaparece de tu Feed (y tú del
 * suyo), ninguno puede volver a pedir amistad al otro ni invitarle a
 * practicar, y no os sugerimos el uno al otro. La otra persona no recibe
 * ningún aviso.
 */
export async function blockUser(targetOwnerId: string): Promise<void> {
  const { userId, client } = await requireUserId();
  await blockAsUser(client, userId, parseUuid(targetOwnerId) as UserId);
  revalidateSocialPages();
}

export async function unblockUser(targetOwnerId: string): Promise<void> {
  const { userId, client } = await requireUserId();
  const { error } = await client
    .from("user_blocks")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_id", parseUuid(targetOwnerId));
  if (error) throw error;
  revalidateSocialPages();
}

export interface BlockedUser {
  ownerId: string;
  username: string;
  avatarUrl: string | null;
  blockedAt: string;
}

/** Tu lista de bloqueados, para poder desbloquear desde Ajustes. Los
 * nombres van con la clave de servicio: tras bloquear ya no sois amigos y
 * RLS dejaría de enseñarte su perfil. */
export async function listBlockedUsers(): Promise<BlockedUser[]> {
  const { userId, client } = await requireUserId();
  const { data, error } = await client
    .from("user_blocks")
    .select("blocked_id, created_at")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (data.length === 0) return [];

  const profiles = await new SupabaseProfileRepository(createServiceClient()).listByOwnerIds(
    data.map((row) => row.blocked_id as UserId),
  );
  return data.flatMap((row) => {
    const profile = profiles.get(row.blocked_id as UserId);
    if (!profile) return [];
    return [
      {
        ownerId: row.blocked_id,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        blockedAt: row.created_at,
      },
    ];
  });
}

export interface ReportUserInput {
  reportedOwnerId: string;
  reason: ReportReason;
  context: ReportContext;
  /** La publicación del Feed denunciada, si se denunció desde una. */
  contentId?: string | null;
  details?: string | null;
  alsoBlock?: boolean;
}

export type ReportUserResult = { ok: true } | { ok: false; error: "rate_limited" | "invalid" };

/**
 * Denunciar a alguien (o algo que ha publicado). Se guarda en
 * `user_reports`, le llega un correo al administrador si está configurado
 * y aparece en /community/reports. Devuelve el error en vez de lanzarlo
 * porque en producción Next oculta el mensaje de los errores de las
 * acciones, y aquí sí hay que poder decir "has llegado al límite de hoy".
 */
export async function reportUser(input: ReportUserInput): Promise<ReportUserResult> {
  const { userId, client } = await requireUserId();

  let reportedId: UserId;
  let contentId: string | null;
  try {
    reportedId = parseUuid(input.reportedOwnerId) as UserId;
    contentId = input.contentId ? parseUuid(input.contentId) : null;
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (
    reportedId === userId ||
    !REPORT_REASONS.includes(input.reason) ||
    !REPORT_CONTEXTS.includes(input.context)
  ) {
    return { ok: false, error: "invalid" };
  }
  const details = input.details?.trim().slice(0, REPORT_DETAILS_MAX_LENGTH) || null;

  const { error } = await client.from("user_reports").insert({
    reporter_id: userId,
    reported_id: reportedId,
    reason: input.reason,
    context: input.context,
    content_id: contentId,
    details,
  });
  if (error) {
    // 42501 = lo ha rechazado RLS: con todo lo anterior validado, solo
    // puede ser el tope de denuncias al día (ver la migración).
    if (error.code === "42501") return { ok: false, error: "rate_limited" };
    // 23503 = la cuenta denunciada ya no existe.
    if (error.code === "23503") return { ok: false, error: "invalid" };
    throw error;
  }

  if (input.alsoBlock) {
    await blockAsUser(client, userId, reportedId);
    revalidateSocialPages();
  }

  after(async () => {
    const service = createServiceClient();
    const [profiles, open] = await Promise.all([
      new SupabaseProfileRepository(service).listByOwnerIds([userId, reportedId]),
      service
        .from("user_reports")
        .select("id", { count: "exact", head: true })
        .eq("reported_id", reportedId)
        .eq("status", "open"),
    ]);
    await notifyReport({
      reporterUsername: profiles.get(userId)?.username ?? "alguien",
      reportedUsername: profiles.get(reportedId)?.username ?? reportedId,
      reason: input.reason,
      context: input.context,
      details,
      openReportsAgainstUser: open.count ?? 1,
    });
  });

  return { ok: true };
}

// ─── Revisión de denuncias (solo administradores) ───────────────────────

async function requireAdmin() {
  const { userId, client } = await requireUserId();
  const profile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  if (!profile?.isAdmin) throw new UnauthorizedError();
  return { userId };
}

export interface OpenReport {
  id: string;
  createdAt: string;
  reason: ReportReason;
  context: ReportContext;
  details: string | null;
  reporterUsername: string | null;
  reportedOwnerId: string;
  reportedUsername: string;
  /** Denuncias abiertas contra la misma persona (esta incluida). */
  openAgainstUser: number;
  contentId: string | null;
  /** Lo que se denunció, si fue una publicación del Feed que sigue existiendo. */
  content: { title: string | null; createdAt: string } | null;
}

const OPEN_REPORTS_LIMIT = 200;

export async function listOpenReports(): Promise<OpenReport[]> {
  await requireAdmin();
  const service = createServiceClient();

  const { data: reports, error } = await service
    .from("user_reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(OPEN_REPORTS_LIMIT);
  if (error) throw error;
  if (reports.length === 0) return [];

  const userIds = [
    ...new Set(
      reports.flatMap((r) => [r.reported_id, r.reporter_id].filter((id): id is string => !!id)),
    ),
  ] as UserId[];
  const sessionShareIds = reports
    .filter((r) => r.context === "session_share" && r.content_id)
    .map((r) => r.content_id!);
  const goalShareIds = reports
    .filter((r) => r.context === "weekly_goal_share" && r.content_id)
    .map((r) => r.content_id!);

  const [profiles, sessionShares, goalShares] = await Promise.all([
    new SupabaseProfileRepository(service).listByOwnerIds(userIds),
    sessionShareIds.length > 0
      ? service.from("session_shares").select("id, title, created_at").in("id", sessionShareIds)
      : Promise.resolve({ data: [], error: null }),
    goalShareIds.length > 0
      ? service.from("weekly_goal_shares").select("id, created_at").in("id", goalShareIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (sessionShares.error) throw sessionShares.error;
  if (goalShares.error) throw goalShares.error;

  const contentById = new Map<string, OpenReport["content"]>([
    ...sessionShares.data.map((s) => [s.id, { title: s.title, createdAt: s.created_at }] as const),
    ...goalShares.data.map((s) => [s.id, { title: null, createdAt: s.created_at }] as const),
  ]);

  const openCounts = new Map<string, number>();
  for (const r of reports) openCounts.set(r.reported_id, (openCounts.get(r.reported_id) ?? 0) + 1);

  return reports.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    reason: r.reason as ReportReason,
    context: r.context as ReportContext,
    details: r.details,
    reporterUsername: r.reporter_id
      ? (profiles.get(r.reporter_id as UserId)?.username ?? null)
      : null,
    reportedOwnerId: r.reported_id,
    reportedUsername: profiles.get(r.reported_id as UserId)?.username ?? r.reported_id,
    openAgainstUser: openCounts.get(r.reported_id) ?? 1,
    contentId: r.content_id,
    content: r.content_id ? (contentById.get(r.content_id) ?? null) : null,
  }));
}

export async function countOpenReports(): Promise<number> {
  await requireAdmin();
  const { count, error } = await createServiceClient()
    .from("user_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  if (error) throw error;
  return count ?? 0;
}

export async function resolveReport(reportId: string): Promise<void> {
  await requireAdmin();
  const { error } = await createServiceClient()
    .from("user_reports")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", parseUuid(reportId));
  if (error) throw error;
  revalidatePath("/community/reports");
}

/** Quitar del Feed la publicación denunciada — la única medida que se
 * puede tomar desde la app; suspender una cuenta sigue siendo cosa del
 * panel de Supabase (Authentication → Users). */
export async function removeReportedContent(reportId: string): Promise<void> {
  await requireAdmin();
  const service = createServiceClient();
  const { data: report, error } = await service
    .from("user_reports")
    .select("context, content_id")
    .eq("id", parseUuid(reportId))
    .single();
  if (error) throw error;
  if (!report.content_id) return;

  const table =
    report.context === "session_share"
      ? "session_shares"
      : report.context === "weekly_goal_share"
        ? "weekly_goal_shares"
        : null;
  if (!table) return;

  const removed = await service.from(table).delete().eq("id", report.content_id);
  if (removed.error) throw removed.error;
  const resolved = await service
    .from("user_reports")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("content_id", report.content_id)
    .eq("status", "open");
  if (resolved.error) throw resolved.error;
  revalidatePath("/community/reports");
  revalidatePath("/feed");
}
