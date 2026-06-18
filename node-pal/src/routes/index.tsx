import { createFileRoute } from "@tanstack/react-router";
import { FlowCanvas } from "@/components/FlowCanvas";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mapify" },
      { name: "description", content: "Map data flows across systems with drag-and-drop diagrams, sheets, and encrypted cloud sync." },
      { property: "og:title", content: "Mapify" },
      { property: "og:description", content: "Map data flows across systems with drag-and-drop diagrams, sheets, and encrypted cloud sync." },
      { property: "og:image", content: "/default.png" },
    ],
  }),
  component: Index,
  ssr: false,
});

function Index() {
  return (
    <>
      <FlowCanvas />
      <Toaster />
    </>
  );
}
