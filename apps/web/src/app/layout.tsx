import type { Metadata } from 'next';
import './globals.css';
import { getSession } from '@/lib/session';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';

export const metadata: Metadata = {
  title: 'PaisaBridge PK — Custom Payment Gateway SaaS',
  description: 'Automated JazzCash, EasyPaisa, and Bank Transfer Payment Gateway for Pakistan',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen flex flex-col font-sans">
        {session?.isImpersonating && (
          <ImpersonationBanner businessName={session.name} />
        )}
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
