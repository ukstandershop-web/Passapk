import { ParsedNotification, PaymentMethodType } from '../types';
import { round2 } from './amount';

interface ParserRule {
  name: string;
  packages: string[];
  amountRegexes: RegExp[];
  tidRegexes: RegExp[];
  senderRegexes: RegExp[];
  method: PaymentMethodType;
}

export const DEFAULT_PARSER_RULES: ParserRule[] = [
  // 1. JazzCash
  {
    name: 'JazzCash',
    packages: [
      'com.techlogix.mobilinkcustomer',
      'com.android.mms',
      'com.google.android.apps.messaging',
    ],
    amountRegexes: [
      /(?:Received|received)\s+(?:Rs\.?|PKR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /(?:Rs\.?|PKR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:received|credited)/i,
      /you\s+have\s+received\s+(?:Rs\.?|PKR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ],
    tidRegexes: [
      /(?:TID|Trx\s*ID|Transaction\s*ID)[:\s]+([A-Za-z0-9]+)/i,
      /TID\s*([0-9]{8,14})/i,
    ],
    senderRegexes: [
      /from\s+([0-9]{11})/i,
      /from\s+([A-Za-z\s]+?)(?:,\s*([0-9]{11})|\.|\s+TID)/i,
    ],
    method: 'jazzcash',
  },

  // 2. EasyPaisa
  {
    name: 'EasyPaisa',
    packages: [
      'com.telenor.pakistan.easypaisa',
      'com.android.mms',
      'com.google.android.apps.messaging',
    ],
    amountRegexes: [
      /(?:received|credited)\s+(?:Rs\.?|PKR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /(?:Rs\.?|PKR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:received|credited)/i,
      /you\s+have\s+received\s+(?:Rs\.?|PKR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ],
    tidRegexes: [
      /(?:TRX\s*ID|Trx\s*ID|Transaction\s*ID)[:\s]+([0-9A-Za-z]+)/i,
      /(?:Ref|Reference)[:\s]+([0-9A-Za-z]+)/i,
    ],
    senderRegexes: [
      /from\s+([A-Za-z\s]+?)(?:,\s*([0-9]{11})|\.|\s+Your)/i,
      /from\s+([0-9]{11})/i,
    ],
    method: 'easypaisa',
  },

  // 3. SadaPay
  {
    name: 'SadaPay',
    packages: [
      'pk.com.sadapay',
      'com.android.mms',
      'com.google.android.apps.messaging',
    ],
    amountRegexes: [
      /received\s+(?:Rs\.?|PKR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /(?:Rs\.?|PKR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s+received/i,
    ],
    tidRegexes: [
      /(?:Ref|Reference|ID)[:\s]+([0-9A-Za-z]+)/i,
    ],
    senderRegexes: [
      /from\s+([A-Za-z\s]+?)(?:\.|\s+Ref|$)/i,
    ],
    method: 'sadapay',
  },

  // 4. NayaPay
  {
    name: 'NayaPay',
    packages: [
      'com.nayapay.live',
      'com.android.mms',
      'com.google.android.apps.messaging',
    ],
    amountRegexes: [
      /received\s+(?:Rs\.?|PKR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /Money\s+In:\s+You\s+received\s+(?:Rs\.?|PKR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ],
    tidRegexes: [
      /(?:Ref|Reference|Txn)[:\s]+([0-9A-Za-z]+)/i,
    ],
    senderRegexes: [
      /from\s+([A-Za-z\s]+?)(?:\.|\s+Ref|$)/i,
    ],
    method: 'nayapay',
  },

  // 5. General Bank Transfer (Meezan, HBL, Alfalah, Faysal, MCB, Raast)
  {
    name: 'BankTransfer',
    packages: [
      'com.meezanbank.mbbl',
      'com.ofss.fcdb.mobile.android.b001',
      'com.bankalfalah.artemismfpa',
      'com.faysalbank.faysaldigital',
      'com.mcb.mbusiness',
      'com.android.mms',
      'com.google.android.apps.messaging',
    ],
    amountRegexes: [
      /(?:credited\s+(?:by|with)|credited)\s*(?:Rs\.?|PKR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /(?:PKR|Rs\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s+credited/i,
      /credit\s+of\s+(?:Rs\.?|PKR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ],
    tidRegexes: [
      /(?:Ref|Txn|Reference|TID|STAN)[:\s]+([0-9A-Za-z]+)/i,
      /Ref\s*#?\s*([0-9A-Za-z]+)/i,
    ],
    senderRegexes: [
      /from\s+([A-Za-z0-9\s]+?)(?:on|\.|\s+Ref|$)/i,
    ],
    method: 'bank_transfer',
  },
];

/**
 * Normalizes raw numeric string by removing commas and returns float
 */
function parseCleanAmount(raw: string): number | undefined {
  const clean = raw.replace(/,/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? undefined : round2(num);
}

/**
 * Parses incoming SMS / push notification content to extract financial data
 */
export function parseNotification(
  packageName: string,
  title: string | undefined,
  content: string,
  customRules: ParserRule[] = DEFAULT_PARSER_RULES
): ParsedNotification {
  const fullText = `${title || ''} ${content}`.trim();

  // Quick check: does the message contain financial indicators?
  const financialKeywords = [
    'received',
    'credited',
    'credit of',
    'money in',
    'rs.',
    'pkr',
    'tid',
    'trx',
  ];
  const lower = fullText.toLowerCase();
  const isLikelyFinancial = financialKeywords.some((kw) => lower.includes(kw));

  if (!isLikelyFinancial) {
    return {
      is_financial: false,
      raw_content: content,
    };
  }

  // Find rules matching the package name first, or fall back to all rules for SMS apps
  const matchedRules = customRules.filter((r) =>
    r.packages.includes(packageName)
  );
  const rulesToTry = matchedRules.length > 0 ? matchedRules : customRules;

  for (const rule of rulesToTry) {
    let extractedAmount: number | undefined;
    for (const regex of rule.amountRegexes) {
      const match = fullText.match(regex);
      if (match && match[1]) {
        extractedAmount = parseCleanAmount(match[1]);
        if (extractedAmount !== undefined) break;
      }
    }

    if (extractedAmount !== undefined) {
      // Extract TID
      let tid: string | undefined;
      for (const regex of rule.tidRegexes) {
        const match = fullText.match(regex);
        if (match && match[1]) {
          tid = match[1].trim();
          break;
        }
      }

      // Extract Sender
      let sender: string | undefined;
      for (const regex of rule.senderRegexes) {
        const match = fullText.match(regex);
        if (match && match[1]) {
          sender = match[1].trim();
          break;
        }
      }

      return {
        is_financial: true,
        amount: extractedAmount,
        tid,
        sender,
        method: rule.method,
        raw_content: content,
      };
    }
  }

  // Fallback generic amount extraction if financial keywords were present
  const genericAmountMatch = fullText.match(/(?:Rs\.?|PKR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const genericAmount = genericAmountMatch ? parseCleanAmount(genericAmountMatch[1]) : undefined;

  return {
    is_financial: genericAmount !== undefined,
    amount: genericAmount,
    raw_content: content,
  };
}

/**
 * Parses notification using dynamic rules stored in the settings table
 */
export function parseWithDynamicRules(
  packageName: string,
  title: string | undefined,
  content: string,
  dynamicRules: Array<{
    provider: string;
    sender_package: string;
    regex_amount: string;
    regex_tid: string;
    regex_sender: string;
    active: boolean;
  }>
): ParsedNotification {
  const fullText = `${title || ''} ${content}`.trim();
  const lower = fullText.toLowerCase();

  const financialKeywords = ['received', 'credited', 'credit of', 'money in', 'rs.', 'pkr', 'tid', 'trx'];
  if (!financialKeywords.some((kw) => lower.includes(kw))) {
    return { is_financial: false, raw_content: content };
  }

  const activeRules = dynamicRules.filter((r) => r.active);
  const smsPackages = ['com.android.mms', 'com.google.android.apps.messaging'];

  for (const rule of activeRules) {
    const isPackageMatch =
      rule.sender_package === packageName ||
      smsPackages.includes(packageName) ||
      !rule.sender_package;

    if (!isPackageMatch) continue;

    let amount: number | undefined;
    if (rule.regex_amount) {
      try {
        const m = fullText.match(new RegExp(rule.regex_amount, 'i'));
        if (m && m[1]) {
          amount = parseCleanAmount(m[1]);
        }
      } catch {}
    }

    if (amount !== undefined) {
      let tid: string | undefined;
      let sender: string | undefined;

      if (rule.regex_tid) {
        try {
          const m = fullText.match(new RegExp(rule.regex_tid, 'i'));
          if (m && m[1]) tid = m[1].trim();
        } catch {}
      }

      if (rule.regex_sender) {
        try {
          const m = fullText.match(new RegExp(rule.regex_sender, 'i'));
          if (m && m[1]) sender = m[1].trim();
        } catch {}
      }

      return {
        is_financial: true,
        amount,
        tid,
        sender,
        raw_content: content,
      };
    }
  }

  // Fallback to default static parser rules
  return parseNotification(packageName, title, content);
}
