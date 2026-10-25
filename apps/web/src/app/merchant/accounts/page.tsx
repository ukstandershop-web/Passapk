import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { PaymentAccount } from '@paisabridge/shared';
import { AccountsManager } from './AccountsManager';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const session = await getSession();
  const db = getDb();
  let accounts: PaymentAccount[] = [];

  if (session?.merchantId) {
    try {
      accounts = await db.select<PaymentAccount>('payment_accounts', {
        filters: { merchant_id: session.merchantId },
        order: { column: 'priority', ascending: false },
      });
    } catch (err) {
      console.error('Failed to load merchant accounts:', err);
    }
  }

  return <AccountsManager initialAccounts={accounts} />;
}
