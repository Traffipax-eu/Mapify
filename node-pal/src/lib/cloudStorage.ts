import { requireSupabaseClient, assertNoSupabaseError } from "./supabaseClient";

export interface CloudSnapshotSummary {
  id: string;
  projectName: string;
  sheetName: string;
  updatedAt: string;
}

export async function uploadEncryptedSnapshot(params: {
  projectName: string;
  sheetName: string;
  ciphertext: string;
}): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from("mapify_snapshots").insert({
    project_name: params.projectName,
    sheet_name: params.sheetName,
    ciphertext: params.ciphertext,
    updated_at: new Date().toISOString(),
  });

  assertNoSupabaseError(error);
}

export async function listSnapshots(): Promise<CloudSnapshotSummary[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("mapify_snapshots")
    .select("id, project_name, sheet_name, updated_at")
    .order("updated_at", { ascending: false });

  assertNoSupabaseError(error);

  return (data ?? []).map((row) => ({
    id: row.id,
    projectName: row.project_name,
    sheetName: row.sheet_name,
    updatedAt: row.updated_at,
  }));
}

export async function fetchSnapshot(id: string): Promise<string> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("mapify_snapshots")
    .select("ciphertext")
    .eq("id", id)
    .single();

  assertNoSupabaseError(error);
  return data.ciphertext;
}

export async function listSnapshotsForProject(projectName: string): Promise<CloudSnapshotSummary[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("mapify_snapshots")
    .select("id, project_name, sheet_name, updated_at")
    .eq("project_name", projectName.trim())
    .order("updated_at", { ascending: false });

  assertNoSupabaseError(error);

  return (data ?? []).map((row) => ({
    id: row.id,
    projectName: row.project_name,
    sheetName: row.sheet_name,
    updatedAt: row.updated_at,
  }));
}

/** Delete one encrypted backup — only when it belongs to the open project. */
export async function deleteEncryptedSnapshot(id: string, projectName: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("mapify_snapshots")
    .delete()
    .eq("id", id)
    .eq("project_name", projectName.trim())
    .select("id");

  assertNoSupabaseError(error);
  if (!data?.length) {
    throw new Error("This encrypted backup is not part of the project you currently have open.");
  }
}
