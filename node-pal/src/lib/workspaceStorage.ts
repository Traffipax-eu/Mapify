import Dexie, { type Table } from "dexie";
import { DEFAULT_SCHEMA, type GraphState, type Schema } from "./storage";

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  activeSheetId: string;
}

export interface Sheet {
  id: string;
  projectId: string;
  name: string;
  order: number;
  nodes: unknown[];
  edges: unknown[];
  drawings?: string[];
  viewport?: GraphState["viewport"];
  schema: Schema;
  updatedAt: number;
}

export interface SheetCanvasState {
  nodes: unknown[];
  edges: unknown[];
  drawings?: string[];
  viewport?: GraphState["viewport"];
  schema: Schema;
}

export interface WorkspaceState {
  project: Project;
  sheets: Sheet[];
  activeSheet: Sheet;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function stripSchemaId(schema: Schema): Schema {
  const { id: _id, ...rest } = schema;
  return { ...rest, timestamp: Date.now() };
}

class WorkspaceDatabase extends Dexie {
  projects!: Table<Project, string>;
  sheets!: Table<Sheet, string>;
  graphState!: Table<GraphState>;
  schemaState!: Table<Schema>;

  constructor() {
    super("DataFlowDB");

    this.version(1).stores({
      graphState: "++id, timestamp",
      schemaState: "++id, timestamp",
    });

    this.version(2)
      .stores({
        graphState: "++id, timestamp",
        schemaState: "++id, timestamp",
        projects: "id, updatedAt",
        sheets: "id, projectId, order",
      })
      .upgrade(async (tx) => {
        const existingProjects = await tx.table("projects").count();
        if (existingProjects > 0) return;

        const graphState = await tx.table("graphState").orderBy("timestamp").last();
        const schemaState = await tx.table("schemaState").orderBy("timestamp").last();

        const projectId = newId("proj");
        const sheetId = newId("sheet");
        const now = Date.now();

        await tx.table("projects").add({
          id: projectId,
          name: "Untitled Project",
          createdAt: now,
          updatedAt: now,
          activeSheetId: sheetId,
        });

        await tx.table("sheets").add({
          id: sheetId,
          projectId,
          name: "Sheet 1",
          order: 0,
          nodes: graphState?.nodes ?? [],
          edges: graphState?.edges ?? [],
          drawings: graphState?.drawings,
          viewport: graphState?.viewport,
          schema: schemaState
            ? { ...schemaState, timestamp: schemaState.timestamp ?? now }
            : { ...DEFAULT_SCHEMA, timestamp: now },
          updatedAt: now,
        });
      });
  }
}

const workspaceDb = new WorkspaceDatabase();

async function ensureDefaultWorkspace(): Promise<WorkspaceState> {
  let project = await workspaceDb.projects.orderBy("updatedAt").last();
  if (!project) {
    const projectId = newId("proj");
    const sheetId = newId("sheet");
    const now = Date.now();
    project = {
      id: projectId,
      name: "Untitled Project",
      createdAt: now,
      updatedAt: now,
      activeSheetId: sheetId,
    };
    await workspaceDb.projects.add(project);
    await workspaceDb.sheets.add({
      id: sheetId,
      projectId,
      name: "Sheet 1",
      order: 0,
      nodes: [],
      edges: [],
      schema: { ...DEFAULT_SCHEMA, timestamp: now },
      updatedAt: now,
    });
  }

  const sheets = await workspaceDb.sheets.where("projectId").equals(project.id).sortBy("order");
  let activeSheet = sheets.find((s) => s.id === project!.activeSheetId) ?? sheets[0];

  if (!activeSheet) {
    const sheetId = newId("sheet");
    const now = Date.now();
    activeSheet = {
      id: sheetId,
      projectId: project.id,
      name: "Sheet 1",
      order: 0,
      nodes: [],
      edges: [],
      schema: { ...DEFAULT_SCHEMA, timestamp: now },
      updatedAt: now,
    };
    await workspaceDb.sheets.add(activeSheet);
    await workspaceDb.projects.update(project.id, { activeSheetId: sheetId, updatedAt: now });
    project = { ...project, activeSheetId: sheetId, updatedAt: now };
    sheets.push(activeSheet);
  }

  return { project, sheets, activeSheet };
}

export const workspaceStorage = {
  async loadWorkspace(): Promise<WorkspaceState> {
    return ensureDefaultWorkspace();
  },

  async saveSheetState(sheetId: string, state: SheetCanvasState): Promise<void> {
    const now = Date.now();
    await workspaceDb.sheets.update(sheetId, {
      nodes: state.nodes,
      edges: state.edges,
      drawings: state.drawings,
      viewport: state.viewport,
      schema: stripSchemaId(state.schema),
      updatedAt: now,
    });
    const sheet = await workspaceDb.sheets.get(sheetId);
    if (sheet) {
      await workspaceDb.projects.update(sheet.projectId, { updatedAt: now });
    }
  },

  async updateProjectName(projectId: string, name: string): Promise<Project> {
    const now = Date.now();
    await workspaceDb.projects.update(projectId, { name: name.trim() || "Untitled Project", updatedAt: now });
    const project = await workspaceDb.projects.get(projectId);
    if (!project) throw new Error("Project not found");
    return project;
  },

  async setActiveSheet(projectId: string, sheetId: string): Promise<Project> {
    const now = Date.now();
    await workspaceDb.projects.update(projectId, { activeSheetId: sheetId, updatedAt: now });
    const project = await workspaceDb.projects.get(projectId);
    if (!project) throw new Error("Project not found");
    return project;
  },

  async renameSheet(sheetId: string, name: string): Promise<Sheet> {
    const now = Date.now();
    const trimmed = name.trim() || "Sheet";
    await workspaceDb.sheets.update(sheetId, { name: trimmed, updatedAt: now });
    const sheet = await workspaceDb.sheets.get(sheetId);
    if (!sheet) throw new Error("Sheet not found");
    return sheet;
  },

  async createSheet(projectId: string, name?: string): Promise<Sheet> {
    const sheets = await workspaceDb.sheets.where("projectId").equals(projectId).sortBy("order");
    const order = sheets.length;
    const now = Date.now();
    const sheet: Sheet = {
      id: newId("sheet"),
      projectId,
      name: name?.trim() || `Sheet ${order + 1}`,
      order,
      nodes: [],
      edges: [],
      schema: { ...DEFAULT_SCHEMA, timestamp: now },
      updatedAt: now,
    };
    await workspaceDb.sheets.add(sheet);
    await workspaceDb.projects.update(projectId, { activeSheetId: sheet.id, updatedAt: now });
    return sheet;
  },

  async deleteSheet(sheetId: string): Promise<WorkspaceState> {
    const sheet = await workspaceDb.sheets.get(sheetId);
    if (!sheet) throw new Error("Sheet not found");

    const sheets = await workspaceDb.sheets.where("projectId").equals(sheet.projectId).sortBy("order");
    if (sheets.length <= 1) {
      throw new Error("Cannot delete the only sheet in a project");
    }

    await workspaceDb.sheets.delete(sheetId);

    const project = await workspaceDb.projects.get(sheet.projectId);
    if (!project) throw new Error("Project not found");

    let nextActiveId = project.activeSheetId;
    if (project.activeSheetId === sheetId) {
      const remaining = sheets.filter((s) => s.id !== sheetId);
      nextActiveId = remaining[0].id;
      await workspaceDb.projects.update(project.id, { activeSheetId: nextActiveId, updatedAt: Date.now() });
    }

    return ensureDefaultWorkspace();
  },

  async getSheetsForProject(projectId: string): Promise<Sheet[]> {
    return workspaceDb.sheets.where("projectId").equals(projectId).sortBy("order");
  },

  async createProject(name?: string): Promise<WorkspaceState> {
    const projectId = newId("proj");
    const sheetId = newId("sheet");
    const now = Date.now();
    const project: Project = {
      id: projectId,
      name: name?.trim() || "Untitled Project",
      createdAt: now,
      updatedAt: now,
      activeSheetId: sheetId,
    };
    const sheet: Sheet = {
      id: sheetId,
      projectId,
      name: "Sheet 1",
      order: 0,
      nodes: [],
      edges: [],
      schema: { ...DEFAULT_SCHEMA, timestamp: now },
      updatedAt: now,
    };

    await workspaceDb.projects.add(project);
    await workspaceDb.sheets.add(sheet);

    return { project, sheets: [sheet], activeSheet: sheet };
  },
};

export default workspaceDb;
