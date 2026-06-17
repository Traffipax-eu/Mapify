import { toJpeg, toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { getNodesBounds, getViewportForBounds, type Node, type ReactFlowInstance } from "reactflow";

export type ImageExportFormat = "png" | "jpeg";

const EXPORT_HIDE_SELECTORS = [
  ".react-flow__background",
  ".react-flow__controls",
  ".react-flow__minimap",
  ".react-flow__panel",
  ".react-flow__attribution",
];

function shouldIncludeNode(node: Node): boolean {
  if (!(node instanceof HTMLElement)) {
    return true;
  }
  if (EXPORT_HIDE_SELECTORS.some((selector) => node.matches(selector))) {
    return false;
  }
  if (node.closest(".react-flow__panel")) {
    return false;
  }
  return true;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function captureDiagram(
  hostEl: HTMLElement,
  rfInstance: ReactFlowInstance,
  options: { backgroundColor?: string; quality?: number; pixelRatio?: number },
): Promise<{ dataUrl: string; width: number; height: number; format: "png" | "jpeg" }> {
  const flowEl = hostEl.querySelector(".react-flow") as HTMLElement | null;
  const viewportEl = hostEl.querySelector(".react-flow__viewport") as HTMLElement | null;
  const captureEl = viewportEl ?? flowEl;

  if (!captureEl) {
    throw new Error("React Flow canvas not found");
  }

  const nodes = rfInstance.getNodes();
  const originalViewport = rfInstance.getViewport();
  hostEl.classList.add("is-exporting");

  try {
    if (nodes.length > 0) {
      const bounds = getNodesBounds(nodes);
      if (bounds.width > 0 && bounds.height > 0) {
        const fitted = getViewportForBounds(
          bounds,
          captureEl.clientWidth || hostEl.clientWidth,
          captureEl.clientHeight || hostEl.clientHeight,
          0.5,
          2,
          64,
        );
        rfInstance.setViewport(fitted, { duration: 0 });
      }
    }

    await wait(150);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const pixelRatio = options.pixelRatio ?? 2;
    const captureOptions = {
      pixelRatio,
      cacheBust: true,
      skipFonts: true,
      filter: shouldIncludeNode,
    };

    const useJpeg = options.backgroundColor === "#ffffff";
    const dataUrl = useJpeg
      ? await toJpeg(captureEl, {
          ...captureOptions,
          backgroundColor: "#ffffff",
          quality: options.quality ?? 0.95,
        })
      : await toPng(captureEl, {
          ...captureOptions,
          backgroundColor: options.backgroundColor ?? "transparent",
        });

    const img = await loadImage(dataUrl);
    return {
      dataUrl,
      width: img.width,
      height: img.height,
      format: useJpeg ? "jpeg" : "png",
    };
  } finally {
    rfInstance.setViewport(originalViewport, { duration: 0 });
    hostEl.classList.remove("is-exporting");
  }
}

export async function exportCanvasImage(
  hostEl: HTMLElement,
  rfInstance: ReactFlowInstance,
  format: ImageExportFormat,
  filename?: string,
): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 10);
  const { dataUrl } = await captureDiagram(hostEl, rfInstance, {
    backgroundColor: format === "jpeg" ? "#ffffff" : "transparent",
    pixelRatio: 2,
  });

  const ext = format === "jpeg" ? "jpg" : "png";
  downloadDataUrl(dataUrl, filename ?? `dataflow-diagram-${stamp}.${ext}`);
}

export async function exportCanvasPdf(
  hostEl: HTMLElement,
  rfInstance: ReactFlowInstance,
  filename?: string,
): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 10);
  const { dataUrl, width, height, format } = await captureDiagram(hostEl, rfInstance, {
    backgroundColor: "#ffffff",
    pixelRatio: 2,
  });

  const orientation = width >= height ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [width, height],
    hotfixes: ["px_scaling"],
  });

  pdf.addImage(dataUrl, format === "jpeg" ? "JPEG" : "PNG", 0, 0, width, height);
  pdf.save(filename ?? `dataflow-diagram-${stamp}.pdf`);
}
