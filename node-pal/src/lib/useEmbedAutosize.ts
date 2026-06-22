import { useEffect } from "react";
import { postEmbedHeight } from "@/lib/embedExport";

export function useEmbedAutosize(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const publishHeight = () => {
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        document.documentElement.clientHeight,
      );
      postEmbedHeight(height);
    };

    publishHeight();
    const resizeObserver = new ResizeObserver(publishHeight);
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);
    window.addEventListener("resize", publishHeight);

    const intervalId = window.setInterval(publishHeight, 500);
    const timeoutId = window.setTimeout(() => window.clearInterval(intervalId), 5000);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", publishHeight);
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [active]);
}
