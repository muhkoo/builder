/**
 * Task Board — a shared, team-wide task list with a realtime channel.
 * The generic feature components are built from this config.
 */

export const APP_NAME = "Task Board";

export interface AppField {
  name: string;
  type: "text" | "boolean" | "number";
  label: string;
  required?: boolean;
}

/** The `tasks` table provisioned by app.json. */
export const TABLE: { name: string; fields: AppField[] } = {
  name: "tasks",
  fields: [
    { name: "title", type: "text", label: "Task", required: true },
    { name: "done", type: "boolean", label: "Done" },
  ],
};

/** The team channel. */
export const CHANNEL: string | null = "general";
