/** User-facing warning when a single document exceeds this size (bytes). */
export const WARN_DOCUMENT_BYTES = 5 * 1024 * 1024

/**
 * Serialized JSON larger than this skips localStorage + Supabase sync (session-only in memory).
 * Typical localStorage quota is ~5–10 MB per origin; stay safely below for multi-key apps.
 */
export const SOFT_MAX_PERSIST_BYTES = 2 * 1024 * 1024

/** Run Myers line diff in a web worker above this combined character count (left + right). */
export const DIFF_WORKER_CHAR_THRESHOLD = 400_000

/** Parse JSON off the main thread when document is this large (characters). */
export const JSON_PARSE_WORKER_THRESHOLD = 500_000

/** Skip deep JSON structural diff above this combined size; suggest Text mode. */
export const JSON_STRUCTURAL_DIFF_MAX_COMBINED = 3 * 1024 * 1024

/** Virtualize CSV table body when row count exceeds this. */
export const CSV_VIRTUALIZE_ROW_THRESHOLD = 500

/** Base64 encode: avoid holding full string in UI — download-first when file exceeds this. */
export const BASE64_LARGE_FILE_BYTES = 2 * 1024 * 1024
