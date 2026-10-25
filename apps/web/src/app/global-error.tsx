'use client';

export const dynamic = 'force-dynamic';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white min-h-screen flex items-center justify-center p-6 antialiased">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <h1 className="text-3xl font-extrabold text-rose-500 mb-2">System Error</h1>
          <p className="text-slate-400 text-xs mb-6">
            {error?.message || 'A critical application error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-emerald-600/20"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
