import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-void text-text-light relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,var(--hive-glow),transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--hive-glow),transparent_70%)] blur-3xl opacity-60"
        aria-hidden
      />
      {/* Header */}
      <header className="border-b border-border-subtle bg-bg-void/80 backdrop-blur relative z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-bg-carapace border border-border-subtle flex items-center justify-center shadow-[0_0_18px_var(--hive-glow)]">
              <svg
                className="w-5 h-5 text-hive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <span className="font-display text-lg tracking-tight">Overmind</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm text-text-dim hover:text-text-light transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm px-4 py-2 bg-hive hover:bg-hive-dim text-white rounded-full font-medium shadow-[0_6px_24px_var(--hive-glow)] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 relative z-10">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl md:text-6xl font-display font-semibold mb-6 leading-tight tracking-tight">
            Your portfolio.
            <br />
            <span className="text-hive">One command center.</span>
          </h1>
          <p className="text-xl text-text-dim mb-8">
            Track traffic, health, and traction signals across all your products.
            Built for indie hackers who ship fast.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="px-6 py-3 bg-hive hover:bg-hive-dim text-white rounded-full font-medium shadow-[0_6px_24px_var(--hive-glow)] transition-colors"
            >
              Start Free
            </Link>
            <Link
              href="https://github.com/misty-step/overmind"
              target="_blank"
              className="px-6 py-3 border border-border-subtle hover:border-border-glow rounded-full font-medium text-text-light transition-colors"
            >
              View on GitHub
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-6 px-6 relative z-10">
        <div className="max-w-6xl mx-auto text-center text-text-dim text-sm">
          Built by{" "}
          <a
            href="https://mistystep.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-light"
          >
            MistyStep
          </a>
        </div>
      </footer>
    </div>
  );
}
