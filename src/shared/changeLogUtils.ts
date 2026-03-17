import { supabase } from "../supabaseClient";

export type ChangeType = "field_edit" | "status_change" | "item_added" | "item_removed" | "item_edited" | "created";

export interface ChangeLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_type: ChangeType;
  changed_by: string;
  changed_at: string;
  note: string | null;
}

export interface LogChangeParams {
  entity_type: "order" | "pickup_ticket" | "client";
  entity_id: string;
  entity_label: string;
  field_name: string;
  old_value?: string | null;
  new_value?: string | null;
  change_type?: ChangeType;
  changed_by: string;
  note?: string | null;
}

export async function logChange(params: LogChangeParams): Promise<void> {
  await supabase.from("change_logs").insert({
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    entity_label: params.entity_label,
    field_name: params.field_name,
    old_value: params.old_value ?? null,
    new_value: params.new_value ?? null,
    change_type: params.change_type ?? "field_edit",
    changed_by: params.changed_by,
    note: params.note ?? null,
  });
}

export async function logChanges(entries: LogChangeParams[]): Promise<void> {
  if (entries.length === 0) return;
  await supabase.from("change_logs").insert(
    entries.map(p => ({
      entity_type: p.entity_type,
      entity_id: p.entity_id,
      entity_label: p.entity_label,
      field_name: p.field_name,
      old_value: p.old_value ?? null,
      new_value: p.new_value ?? null,
      change_type: p.change_type ?? "field_edit",
      changed_by: p.changed_by,
      note: p.note ?? null,
    }))
  );
}

export async function fetchChangeLogs(
  entity_type: string,
  entity_id: string
): Promise<ChangeLogEntry[]> {
  const { data, error } = await supabase
    .from("change_logs")
    .select("*")
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .order("changed_at", { ascending: false });
  if (error || !data) return [];
  return data as ChangeLogEntry[];
}

export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: Array<{ key: keyof T; label: string }>
): Array<{ key: string; label: string; oldVal: string; newVal: string }> {
  const diffs: Array<{ key: string; label: string; oldVal: string; newVal: string }> = [];
  for (const { key, label } of fields) {
    const oldVal = String(before[key] ?? "");
    const newVal = String(after[key] ?? "");
    if (oldVal !== newVal) {
      diffs.push({ key: String(key), label, oldVal, newVal });
    }
  }
  return diffs;
}

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  field_edit: "Modification",
  status_change: "Changement de statut",
  item_added: "Article ajouté",
  item_removed: "Article retiré",
  item_edited: "Article modifié",
  created: "Création",
};

export const CHANGE_TYPE_COLORS: Record<ChangeType, { bg: string; color: string }> = {
  field_edit: { bg: "#dbeafe", color: "#1d4ed8" },
  status_change: { bg: "#d1fae5", color: "#065f46" },
  item_added: { bg: "#dcfce7", color: "#166534" },
  item_removed: { bg: "#fee2e2", color: "#991b1b" },
  item_edited: { bg: "#fef3c7", color: "#92400e" },
  created: { bg: "#ede9fe", color: "#5b21b6" },
};
