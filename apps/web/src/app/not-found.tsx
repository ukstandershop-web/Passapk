import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
        <h1 className="text-4xl font-extrabold text-emerald-400 mb-2">404</h1>
        <h2 className="text-xl font-bold mb-3">Page Not Found</h2>
        <p className="text-slate-400 text-xs mb-6">
          The page or transaction portal you are looking for does not exist or has expired.
        </p>
        <Link
          href="/"
          className="inline-block py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-emerald-600/20"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
