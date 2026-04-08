"use client";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F] text-white">
      <div className="glow-card rounded-xl p-8 max-w-md text-center space-y-4">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-weavrn-muted">{error.message}</p>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
