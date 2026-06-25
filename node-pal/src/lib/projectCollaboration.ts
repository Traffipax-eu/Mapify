import {
  requireSupabaseClient,
  assertNoSupabaseError,
} from "@/lib/supabaseClient";
import type { Edge, Node, Viewport } from "reactflow";
import type { Schema } from "@/lib/storage";

export type ProjectRole = "viewer" | "editor";

export type CloudProject = {
  id: string;
  name: string;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMember = {
  id: string;
  projectId: string;
  userId: string | null;
  email: string | null;
  role: ProjectRole;
  inviteToken: string | null;
  createdAt: string;
};

export type ProjectVersionSnapshot = {
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
  schema?: Schema;
  drawings?: string[];
};

export type ProjectVersion = {
  id: string;
  projectId: string;
  sheetId: string;
  versionName: string;
  snapshot: ProjectVersionSnapshot;
  createdBy: string | null;
  createdAt: string;
};

function requireSupabase() {
  return requireSupabaseClient();
}

function sanitizeVersionSnapshot(snapshot: ProjectVersionSnapshot): ProjectVersionSnapshot {
  try {
    return JSON.parse(JSON.stringify(snapshot)) as ProjectVersionSnapshot;
  } catch {
    throw new Error("Could not serialize canvas state for cloud storage.");
  }
}

export async function ensureCloudProject(projectId: string, name: string): Promise<CloudProject> {
  const supabase = requireSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("projects")
    .upsert(
      {
        id: projectId,
        name,
        owner_id: null,
        updated_at: now,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  assertNoSupabaseError(error);
  if (!data) {
    throw new Error("Could not create or update cloud project record.");
  }

  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Save a named canvas snapshot to `project_versions`.
 */
export async function saveProjectVersion(
  projectId: string,
  sheetId: string,
  versionName: string,
  snapshotJson: ProjectVersionSnapshot,
  options?: { projectName?: string; createdBy?: string | null },
): Promise<ProjectVersion> {
  const supabase = requireSupabase();
  const projectName = options?.projectName ?? "Untitled Project";
  await ensureCloudProject(projectId, projectName);

  const snapshot = sanitizeVersionSnapshot(snapshotJson);

  const { data, error } = await supabase
    .from("project_versions")
    .insert({
      project_id: projectId,
      sheet_id: sheetId,
      version_name: versionName.trim(),
      snapshot,
      created_by: options?.createdBy ?? null,
    })
    .select("*")
    .single();

  assertNoSupabaseError(error);
  if (!data) {
    throw new Error("Version was not saved — no row returned.");
  }

  return mapVersionRow(data);
}

/**
 * Fetch all versions for a sheet, newest first.
 */
export async function getProjectVersions(
  projectId: string,
  sheetId: string,
): Promise<ProjectVersion[]> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from("project_versions")
    .select("*")
    .eq("project_id", projectId)
    .eq("sheet_id", sheetId)
    .order("created_at", { ascending: false });

  assertNoSupabaseError(error);

  return (data ?? []).map(mapVersionRow);
}

/** @deprecated use getProjectVersions */
export async function listProjectVersions(projectId: string, sheetId?: string): Promise<ProjectVersion[]> {
  if (sheetId) {
    return getProjectVersions(projectId, sheetId);
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("project_versions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  assertNoSupabaseError(error);
  return (data ?? []).map(mapVersionRow);
}

export async function inviteProjectMember(params: {
  projectId: string;
  projectName: string;
  email: string;
  role: ProjectRole;
}): Promise<ProjectMember> {
  const supabase = requireSupabase();
  await ensureCloudProject(params.projectId, params.projectName);

  const inviteToken = crypto.randomUUID();

  const { data, error } = await supabase
    .from("project_members")
    .insert({
      project_id: params.projectId,
      email: params.email.trim().toLowerCase(),
      role: params.role,
      invite_token: inviteToken,
    })
    .select("*")
    .single();

  assertNoSupabaseError(error);
  return mapMemberRow(data);
}

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  assertNoSupabaseError(error);
  return (data ?? []).map(mapMemberRow);
}

export function buildEditorInviteLink(projectId: string, inviteToken: string): string {
  const url = new URL(window.location.origin);
  url.searchParams.set("project", projectId);
  url.searchParams.set("invite", inviteToken);
  url.searchParams.set("role", "editor");
  return url.toString();
}

function mapVersionRow(row: Record<string, unknown>): ProjectVersion {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    sheetId: String(row.sheet_id),
    versionName: String(row.version_name),
    snapshot: row.snapshot as ProjectVersionSnapshot,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
  };
}

function mapMemberRow(row: Record<string, unknown>): ProjectMember {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    userId: row.user_id ? String(row.user_id) : null,
    email: row.email ? String(row.email) : null,
    role: row.role as ProjectRole,
    inviteToken: row.invite_token ? String(row.invite_token) : null,
    createdAt: String(row.created_at),
  };
}
