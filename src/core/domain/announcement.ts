import type { AnnouncementId, UserId } from "@/core/domain/ids";

export interface Announcement {
  id: AnnouncementId;
  authorId: UserId;
  authorUsername: string;
  body: string;
  createdAt: Date;
}

/** Solo se puede editar un anuncio dentro de este plazo desde que se
 * publicó — usado tanto para decidir si mostrar el botón de editar (cliente)
 * como para la comprobación real al guardar (servidor); la RLS de
 * announcements_update_admin_recent aplica la misma ventana en la base de
 * datos, por si alguien llama a la acción directamente. */
export const ANNOUNCEMENT_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function canEditAnnouncement(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() < ANNOUNCEMENT_EDIT_WINDOW_MS;
}
