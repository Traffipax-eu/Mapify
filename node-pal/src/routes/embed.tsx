import { createFileRoute } from "@tanstack/react-router";
import { EmbedViewer } from "@/components/EmbedViewer";

export const Route = createFileRoute("/embed")({
  head: () => ({
    meta: [
      { title: "Mapify Embed" },
      {
        name: "description",
        content: "Interactive Mapify diagram embed.",
      },
    ],
  }),
  component: EmbedPage,
  ssr: false,
});

function EmbedPage() {
  return <EmbedViewer />;
}
