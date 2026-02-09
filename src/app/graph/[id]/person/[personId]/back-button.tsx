import Link from "next/link";

export default function BackButton({
  graphId,
  graphName,
}: {
  graphId: string;
  graphName: string;
}) {
  return (
    <Link
      href={`/graph/${graphId}`}
      className="text-sm text-white/40 transition hover:text-white/60"
    >
      &larr; Back to {graphName}
    </Link>
  );
}
