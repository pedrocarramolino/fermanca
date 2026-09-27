/** Motivos de denuncia — mismos valores que el check de `user_reports.reason`. */
export const REPORT_REASONS = [
  "harassment",
  "inappropriate",
  "spam",
  "impersonation",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Desde dónde se denuncia — mismos valores que `user_reports.context`. */
export const REPORT_CONTEXTS = [
  "profile",
  "friend_request",
  "session_share",
  "weekly_goal_share",
  "group",
] as const;
export type ReportContext = (typeof REPORT_CONTEXTS)[number];

export const REPORT_DETAILS_MAX_LENGTH = 1000;
