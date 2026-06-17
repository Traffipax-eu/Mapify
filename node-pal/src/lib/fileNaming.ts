export function slugifyName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

export function buildFileName(projectName: string, sheetName: string, ext: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const base = `${slugifyName(projectName)}-${slugifyName(sheetName)}-${date}`;
  return `${base}.${ext.replace(/^\./, "")}`;
}
