/**
 * App configuration the UI is built from. The app-builder scaffold step edits
 * this to match your design (table name + fields, channel). The generic
 * feature components read from here — so changing your data model is mostly a
 * matter of editing this file (and provisioning the matching table).
 */

export const APP_NAME = "Muhkoo App";

/** A field shown/edited in the records UI. `name` must match a DB column. */
export interface AppField {
  name: string;
  type: "text" | "boolean" | "number";
  label: string;
  required?: boolean;
}

/**
 * The primary database table this app reads/writes. Provisioned by the backend
 * (via `muhkoo provision`). The server adds `_id` (the row id) and you
 * typically add a `created_at` timestamp for ordering — neither is listed here.
 */
export const TABLE: { name: string; fields: AppField[] } = {
  name: "items",
  fields: [
    { name: "title", type: "text", label: "Title", required: true },
    { name: "done", type: "boolean", label: "Done" },
  ],
};

/** Realtime channel to open. Set to `null` to hide the chat tab. */
export const CHANNEL: string | null = "general";
