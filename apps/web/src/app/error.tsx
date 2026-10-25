'use client';

export const dynamic = 'force-dynamic';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
        <h1 className="text-3xl font-extrabold text-rose-500 mb-2">Something went wrong</h1>
        <p className="text-slate-400 text-xs mb-6">
          {error?.message || 'An unexpected error occurred while processing your request.'}
        </p>
        <button
          onClick={() => reset()}
          className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-emerald-600/20"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
