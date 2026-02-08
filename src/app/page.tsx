import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#1a472a] via-[#2d5a3d] to-[#1e3a28] text-white">
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] text-4xl">
          🌳
        </div>

        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-[#7fdb9a]">Family</span> Connections
        </h1>

        <p className="max-w-md text-lg leading-relaxed text-white/70">
          Discover how your family is connected. Scan QR codes at reunions to
          instantly see your relationship path.
        </p>

        <div className="flex gap-4">
          <Link
            href="/auth/login"
            className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-8 py-3 font-semibold text-[#0f1a14] transition hover:opacity-90"
          >
            Get Started
          </Link>
          <Link
            href="/auth/login"
            className="rounded-xl border border-white/20 px-8 py-3 font-semibold transition hover:bg-white/10"
          >
            Sign In
          </Link>
        </div>

        <p className="text-sm text-white/40">
          New here? Read the{" "}
          <Link
            href="/guide"
            className="text-[#7fdb9a] hover:underline"
          >
            User Guide
          </Link>
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Feature
            icon="📱"
            title="QR Connect"
            description="Scan codes at family reunions to instantly discover how you're related"
          />
          <Feature
            icon="🌳"
            title="Family Graph"
            description="Model all relationship types — not just a rigid tree hierarchy"
          />
          <Feature
            icon="📖"
            title="Stories"
            description="Collect memories, fun facts, and family history from everyone"
          />
        </div>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
      <div className="mb-3 text-3xl">{icon}</div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-white/60">{description}</p>
    </div>
  );
}
