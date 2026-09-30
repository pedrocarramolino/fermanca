# Correos de Supabase Auth

Plantillas de los correos que manda Supabase (confirmar cuenta, restablecer
contraseña…), con el aspecto de Fermança. `supabase/config.toml` las usa en
local; en producción hay que pegarlas a mano en el panel de Supabase:
**Authentication → Emails → Templates** (asunto en "Subject" y el HTML entero
en "Message body", pestaña _Source_).

| Pestaña del panel           | Archivo                              | Asunto                                                | ¿La usa la app hoy?              |
| --------------------------- | ------------------------------------ | ----------------------------------------------------- | -------------------------------- |
| Confirm sign up             | `confirmation.html`                  | Confirma tu cuenta de Fermança                        | Sí (registro)                    |
| Reset password              | `recovery.html`                      | Restablece tu contraseña de Fermança                  | Sí ("¿Olvidaste tu contraseña?") |
| Magic link                  | `magic_link.html`                    | Tu enlace para entrar en Fermança                     | No                               |
| Invite user                 | `invite.html`                        | Te han invitado a Fermança                            | No                               |
| Change email address        | `email_change.html`                  | Confirma tu nuevo correo en Fermança                  | No                               |
| Reauthentication            | `reauthentication.html`              | Tu código de verificación de Fermança                 | No                               |
| Password changed (Security) | `password_changed_notification.html` | Se ha cambiado la contraseña de tu cuenta de Fermança | Solo si se activa el aviso       |

Variables de Supabase que usan: `{{ .ConfirmationURL }}`, `{{ .Token }}`,
`{{ .Email }}`, `{{ .NewEmail }}` y `{{ .Data.username }}` (solo en la
confirmación: `user_metadata.username` no se actualiza si la persona se cambia
el nombre después). El logo se carga de `https://fermanca.com/icons/`.
