/**
 * IDs de dominio con "branding" nominal: dos uuids de entidades distintas
 * (p. ej. TemplateId y SessionId) no son intercambiables para TypeScript,
 * aunque ambos sean `string` en tiempo de ejecución. Evita pasar el id
 * equivocado por error en firmas con varios parámetros de tipo uuid.
 */
type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, "UserId">;
export type CategoryId = Brand<string, "CategoryId">;
export type TemplateId = Brand<string, "TemplateId">;
export type TemplateBlockId = Brand<string, "TemplateBlockId">;
export type SessionId = Brand<string, "SessionId">;
export type SessionBlockId = Brand<string, "SessionBlockId">;
export type ReminderId = Brand<string, "ReminderId">;
export type FriendshipId = Brand<string, "FriendshipId">;
export type WeeklyGoalId = Brand<string, "WeeklyGoalId">;
export type CalendarEventId = Brand<string, "CalendarEventId">;
export type AnnouncementId = Brand<string, "AnnouncementId">;
export type SessionInviteId = Brand<string, "SessionInviteId">;
