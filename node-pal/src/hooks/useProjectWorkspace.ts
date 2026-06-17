import { useCallback, useEffect, useRef, useState } from "react";
import {
  workspaceStorage,
  type Project,
  type Sheet,
  type SheetCanvasState,
  type WorkspaceState,
} from "@/lib/workspaceStorage";

export interface UseProjectWorkspaceResult {
  hydrated: boolean;
  project: Project | null;
  sheets: Sheet[];
  activeSheet: Sheet | null;
  setProjectName: (name: string) => Promise<void>;
  switchSheet: (sheetId: string, saveCurrent: () => Promise<SheetCanvasState>) => Promise<Sheet | null>;
  createSheet: (saveCurrent: () => Promise<SheetCanvasState>) => Promise<Sheet | null>;
  renameSheet: (sheetId: string, name: string) => Promise<void>;
  deleteSheet: (sheetId: string, saveCurrent: () => Promise<SheetCanvasState>) => Promise<void>;
  refreshWorkspace: () => Promise<void>;
}

export function useProjectWorkspace(): UseProjectWorkspaceResult {
  const [hydrated, setHydrated] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheet, setActiveSheet] = useState<Sheet | null>(null);
  const switchingRef = useRef(false);

  const applyWorkspace = useCallback((state: WorkspaceState) => {
    setProject(state.project);
    setSheets(state.sheets);
    setActiveSheet(state.activeSheet);
  }, []);

  const refreshWorkspace = useCallback(async () => {
    const state = await workspaceStorage.loadWorkspace();
    applyWorkspace(state);
  }, [applyWorkspace]);

  useEffect(() => {
    refreshWorkspace()
      .catch(console.error)
      .finally(() => setHydrated(true));
  }, [refreshWorkspace]);

  const setProjectName = useCallback(
    async (name: string) => {
      if (!project) return;
      const updated = await workspaceStorage.updateProjectName(project.id, name);
      setProject(updated);
    },
    [project],
  );

  const switchSheet = useCallback(
    async (sheetId: string, saveCurrent: () => Promise<SheetCanvasState>) => {
      if (!project || !activeSheet || sheetId === activeSheet.id || switchingRef.current) {
        return activeSheet;
      }

      switchingRef.current = true;
      try {
        const currentState = await saveCurrent();
        await workspaceStorage.saveSheetState(activeSheet.id, currentState);
        const updatedProject = await workspaceStorage.setActiveSheet(project.id, sheetId);
        const nextSheets = await workspaceStorage.getSheetsForProject(project.id);
        const nextSheet = nextSheets.find((s) => s.id === sheetId) ?? null;
        setProject(updatedProject);
        setSheets(nextSheets);
        setActiveSheet(nextSheet);
        return nextSheet;
      } finally {
        switchingRef.current = false;
      }
    },
    [project, activeSheet],
  );

  const createSheet = useCallback(
    async (saveCurrent: () => Promise<SheetCanvasState>) => {
      if (!project || !activeSheet) return null;

      const currentState = await saveCurrent();
      await workspaceStorage.saveSheetState(activeSheet.id, currentState);
      const sheet = await workspaceStorage.createSheet(project.id);
      const updatedProject = await workspaceStorage.loadWorkspace();
      applyWorkspace(updatedProject);
      return sheet;
    },
    [project, activeSheet, applyWorkspace],
  );

  const renameSheet = useCallback(async (sheetId: string, name: string) => {
    const updated = await workspaceStorage.renameSheet(sheetId, name);
    setSheets((prev) => prev.map((s) => (s.id === sheetId ? updated : s)));
    setActiveSheet((prev) => (prev?.id === sheetId ? updated : prev));
  }, []);

  const deleteSheet = useCallback(
    async (sheetId: string, saveCurrent: () => Promise<SheetCanvasState>) => {
      if (!activeSheet || !project) return;

      if (activeSheet.id === sheetId) {
        const currentState = await saveCurrent();
        await workspaceStorage.saveSheetState(activeSheet.id, currentState);
      }

      const state = await workspaceStorage.deleteSheet(sheetId);
      applyWorkspace(state);
    },
    [activeSheet, project, applyWorkspace],
  );

  return {
    hydrated,
    project,
    sheets,
    activeSheet,
    setProjectName,
    switchSheet,
    createSheet,
    renameSheet,
    deleteSheet,
    refreshWorkspace,
  };
}
