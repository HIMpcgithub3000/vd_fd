/**
 * Vernacular FD Advisor — Database Seed
 *
 * Run AFTER `npm run db:push` so the tables exist.
 *   npm run seed                                  (uses --env-file=.env.local)
 *   npx tsx --env-file=.env.local scripts/seed.ts (manual)
 *
 * Note: imports are dynamic so dotenv has a chance to populate
 * process.env BEFORE lib/db.ts is evaluated.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' }); // fallback

type SeedPolicy = {
  bankName: string;
  bankType: 'Scheduled Commercial' | 'Small Finance Bank';
  rateRegular: string;
  rateSenior: string;
  minDeposit: number;
  prematurePenalty: string;
  dicgcCovered: boolean;
  rbiLicensed: boolean;
  taxSaverAvailable: boolean;
  faissSessionId: string;
  notes: string;
};

const POLICIES: SeedPolicy[] = [
  {
    bankName: 'SBI',
    bankType: 'Scheduled Commercial',
    rateRegular: '7.10',
    rateSenior: '7.60',
    minDeposit: 1000,
    prematurePenalty: '0.50',
    dicgcCovered: true,
    rbiLicensed: true,
    taxSaverAvailable: true,
    faissSessionId: 'kb_sbi',
    notes: "India's largest public-sector bank. SBI WeCare scheme adds extra 30 bps for senior citizens 5y+.",
  },
  {
    bankName: 'HDFC Bank',
    bankType: 'Scheduled Commercial',
    rateRegular: '7.25',
    rateSenior: '7.75',
    minDeposit: 5000,
    prematurePenalty: '1.00',
    dicgcCovered: true,
    rbiLicensed: true,
    taxSaverAvailable: true,
    faissSessionId: 'kb_hdfc',
    notes: 'Largest private bank by assets. 5y tax-saver FD eligible under §80C.',
  },
  {
    bankName: 'ICICI Bank',
    bankType: 'Scheduled Commercial',
    rateRegular: '7.20',
    rateSenior: '7.70',
    minDeposit: 10000,
    prematurePenalty: '1.00',
    dicgcCovered: true,
    rbiLicensed: true,
    taxSaverAvailable: true,
    faissSessionId: 'kb_icici',
    notes: 'iWish goal-based FD allows step-up deposits.',
  },
  {
    bankName: 'Axis Bank',
    bankType: 'Scheduled Commercial',
    rateRegular: '7.20',
    rateSenior: '7.95',
    minDeposit: 5000,
    prematurePenalty: '1.00',
    dicgcCovered: true,
    rbiLicensed: true,
    taxSaverAvailable: true,
    faissSessionId: 'kb_axis',
    notes: 'Senior citizens get up to 75 bps extra.',
  },
  {
    bankName: 'Suryoday SFB',
    bankType: 'Small Finance Bank',
    rateRegular: '8.60',
    rateSenior: '9.10',
    minDeposit: 1000,
    prematurePenalty: '1.00',
    dicgcCovered: true,
    rbiLicensed: true,
    taxSaverAvailable: false,
    faissSessionId: 'kb_suryoday',
    notes: 'Higher SFB rate. DICGC ₹5L applies. Premature withdrawal not permitted on selected variants ≥ ₹2 cr.',
  },
  {
    bankName: 'Ujjivan SFB',
    bankType: 'Small Finance Bank',
    rateRegular: '8.50',
    rateSenior: '9.00',
    minDeposit: 1000,
    prematurePenalty: '1.00',
    dicgcCovered: true,
    rbiLicensed: true,
    taxSaverAvailable: true,
    faissSessionId: 'kb_ujjivan',
    notes: 'Tax-saver FD available with 5-year lock-in. SFB → DICGC ₹5L cover applies.',
  },
  {
    bankName: 'ESAF SFB',
    bankType: 'Small Finance Bank',
    rateRegular: '8.75',
    rateSenior: '9.25',
    minDeposit: 1000,
    prematurePenalty: '1.00',
    dicgcCovered: true,
    rbiLicensed: true,
    taxSaverAvailable: false,
    faissSessionId: 'kb_esaf',
    notes: 'Highest SFB rate among the seeded set. SFB → DICGC ₹5L cover applies.',
  },
];

type SeedKb = {
  faissSessionId: string;
  title: string;
  source: string;
  category: string;
  language: string;
};

const KB_DOCS: SeedKb[] = [
  { faissSessionId: 'kb_rbi_master', title: 'RBI Master Direction — FD & DICGC', source: 'RBI', category: 'regulatory', language: 'en' },
  { faissSessionId: 'kb_kyc',        title: 'RBI KYC / Video-KYC Norms',          source: 'RBI', category: 'regulatory', language: 'en' },
  { faissSessionId: 'kb_sebi',       title: 'SEBI MF / AIF / SIF Summary',        source: 'SEBI', category: 'regulatory', language: 'en' },
  { faissSessionId: 'kb_dpdpa',      title: 'DPDPA — Data Handling',              source: 'MeitY', category: 'regulatory', language: 'en' },
  { faissSessionId: 'kb_dicgc',      title: 'DICGC Guidelines & Coverage',        source: 'DICGC', category: 'regulatory', language: 'en' },
  { faissSessionId: 'kb_tax',        title: 'Income Tax — TDS on FD (§194A)',     source: 'Income Tax Dept', category: 'regulatory', language: 'en' },
  { faissSessionId: 'kb_suryoday',   title: 'Suryoday SFB — FD Brochure',         source: 'Suryoday SFB', category: 'bank_brochure', language: 'en' },
  { faissSessionId: 'kb_ujjivan',    title: 'Ujjivan SFB — FD Brochure',          source: 'Ujjivan SFB', category: 'bank_brochure', language: 'en' },
  { faissSessionId: 'kb_esaf',       title: 'ESAF SFB — FD Brochure',             source: 'ESAF SFB', category: 'bank_brochure', language: 'en' },
  { faissSessionId: 'kb_sbi',        title: 'SBI — FD Brochure',                  source: 'SBI', category: 'bank_brochure', language: 'en' },
  { faissSessionId: 'kb_hdfc',       title: 'HDFC Bank — FD Brochure',            source: 'HDFC Bank', category: 'bank_brochure', language: 'en' },
  { faissSessionId: 'kb_icici',      title: 'ICICI Bank — FD Brochure',           source: 'ICICI Bank', category: 'bank_brochure', language: 'en' },
  { faissSessionId: 'kb_axis',       title: 'Axis Bank — FD Brochure',            source: 'Axis Bank', category: 'bank_brochure', language: 'en' },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Make sure .env.local exists with a Neon connection string.');
    process.exit(1);
  }

  // Dynamic imports — these touch process.env at module load, so we must
  // require them AFTER dotenv has populated process.env above.
  const { db } = await import('../lib/db');
  const { fdPolicies, kbDocuments } = await import('../lib/schema');
  const { sql } = await import('drizzle-orm');

  console.log('Seeding fdPolicies…');
  for (const p of POLICIES) {
    await db
      .insert(fdPolicies)
      .values(p)
      .onConflictDoUpdate({
        target: fdPolicies.bankName,
        set: {
          bankType: p.bankType,
          rateRegular: p.rateRegular,
          rateSenior: p.rateSenior,
          minDeposit: p.minDeposit,
          prematurePenalty: p.prematurePenalty,
          dicgcCovered: p.dicgcCovered,
          rbiLicensed: p.rbiLicensed,
          taxSaverAvailable: p.taxSaverAvailable,
          faissSessionId: p.faissSessionId,
          notes: p.notes,
          updatedAt: sql`now()`,
        },
      });
    console.log(`  ✓ ${p.bankName} @ ${p.rateRegular}% / sr ${p.rateSenior}%`);
  }

  console.log('Seeding kbDocuments…');
  for (const d of KB_DOCS) {
    await db
      .insert(kbDocuments)
      .values(d)
      .onConflictDoUpdate({
        target: kbDocuments.faissSessionId,
        set: { title: d.title, source: d.source, category: d.category, language: d.language },
      });
    console.log(`  ✓ ${d.faissSessionId} → ${d.title}`);
  }

  console.log('✅ Database seeded');
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
