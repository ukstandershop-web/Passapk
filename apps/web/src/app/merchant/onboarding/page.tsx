import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { DynamicSettingsService, PlanDefinition, PlatformPaymentAccount } from '@paisabridge/shared';
import { OnboardingWizard } from './OnboardingWizard';
import { Compass } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const session = await getSession();
  const db = getDb();
  const settingsService = new DynamicSettingsService(
    db,
    process.env.ENCRYPTION_SECRET || 'paisabridge_encryption_secret_32b'
  );

  let plans: PlanDefinition[] = [];
  let platformAccounts: PlatformPaymentAccount[] = [];
  let existingProof: any = null;
  let merchantStatus = 'pending_activation';

  try {
    const plansVal = await settingsService.get<PlanDefinition[]>('pricing_plans');
    if (plansVal) plans = plansVal;

    const accVal = await settingsService.get<PlatformPaymentAccount[]>('platform_accounts');
    if (accVal) platformAccounts = accVal;

    if (session?.merchantId) {
      existingProof = await db.selectOne<any>('billing_proofs', {
        filters: { merchant_id: session.merchantId, type: 'activation' },
        order: { column: 'created_at', ascending: false },
      });

      const merchant = await db.selectOne<any>('merchants', {
        columns: ['subscription_status'],
        filters: { id: session.merchantId },
      });
      if (merchant?.subscription_status) {
        merchantStatus = merchant.subscription_status;
      }
    }
  } catch (err) {
    console.error('Failed to load onboarding context:', err);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/30">
          <Compass className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Merchant Onboarding Wizard</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Select a plan, pay the activation fee, and submit proof for platform verification
          </p>
        </div>
      </div>

      <OnboardingWizard
        plans={plans}
        platformAccounts={platformAccounts}
        existingProof={existingProof}
        currentStatus={merchantStatus}
      />
    </div>
  );
}
