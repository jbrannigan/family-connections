"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  graphId,
  graphName,
}: {
  graphId: string;
  graphName: string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        // Use browser back if we came from the graph page, otherwise navigate directly
        if (
          typeof window !== "undefined" &&
          document.referrer.includes(`/graph/${graphId}`)
        ) {
          router.back();
        } else {
          router.push(`/graph/${graphId}`);
        }
      }}
      className="text-sm text-white/40 transition hover:text-white/60"
    >
      &larr; Back to {graphName}
    </button>
  );
}
