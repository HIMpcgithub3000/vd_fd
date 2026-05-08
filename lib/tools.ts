import { tool } from 'ai';
import { z } from 'zod';
import { db } from './db';
import { fdPolicies } from './schema';
import { eq, ilike } from 'drizzle-orm';
import { calcMaturitySummary, formatINR } from './finance-math';
import { lookupTerm, type Language } from './glossary';

/**
 * Vercel AI SDK tools used by the chat route.
 *
 * Strict rule: the LLM may NEVER produce financial figures inline. It must
 * call `calculate_maturity` for every maturity / TDS / interest computation.
 * It must call `get_fd_rates` to look up live rates instead of guessing.
 */

export const calculateMaturityTool = tool({
  description:
    'Compute FD maturity amount, interest earned, TDS, and net receivable using deterministic Indian banking math (quarterly compounding). ONLY call this tool when the user has explicitly asked for a maturity/interest amount AND has provided ALL of: principal (₹), tenor in years, and (if they mentioned it) senior-citizen status. DO NOT call this for "what is the rate?" questions — use the retrieved rate-card context for those. DO NOT call this if the user has not given you a principal or tenor — instead, ask them for the missing field after first answering whatever rate question is implied.',
  parameters: z.object({
    principal: z.number().positive().describe('Principal amount in INR (e.g. 100000)'),
    annualRate: z
      .number()
      .min(0)
      .max(20)
      .describe('Annual interest rate as a percent (e.g. 8.5 means 8.50%)'),
    years: z.number().positive().describe('Tenor in years (decimal allowed, e.g. 1.5)'),
    isSeniorCitizen: z.boolean().default(false).describe('Whether the depositor is 60+'),
  }),
  execute: async ({ principal, annualRate, years, isSeniorCitizen }) => {
    const result = calcMaturitySummary(principal, annualRate, years, isSeniorCitizen);
    const y = Number.isInteger(years) ? String(years) : years.toFixed(4);
    const formulaShown = `₹${principal.toLocaleString('en-IN')} × (1 + ${annualRate}/100/4)^(4×${y}) = ₹${result.maturityAmount.toLocaleString('en-IN')}`;
    return {
      ...result,
      formula_shown: formulaShown,
      computation_note: 'Computed by deterministic code — not LLM arithmetic',
      formattedPrincipal: formatINR(result.principal),
      formattedMaturity: formatINR(result.maturityAmount),
      formattedInterest: formatINR(result.interestEarned),
      formattedTds: formatINR(result.tdsDeducted),
      formattedNet: formatINR(result.netReceivable),
      note: 'Quarterly compounding. TDS @ 10% above ₹40,000 (₹50,000 for senior citizens) under §194A.',
    };
  },
});

export const getFdRatesTool = tool({
  description:
    'Look up the current FD rate, senior-citizen rate, premature-withdrawal penalty, DICGC status, RBI licence status, and minimum deposit for a SPECIFIC BANK by name (e.g. "Suryoday SFB", "HDFC Bank"). Call this if and ONLY if the retrieved context does NOT already contain a rate-card block for the bank the user mentioned. The context will usually have the rate-card injected automatically — read the [Source N] blocks before calling this tool.',
  parameters: z.object({
    bankName: z
      .string()
      .min(2)
      .describe('Bank name as the user typed it (e.g. "Suryoday SFB", "HDFC Bank")'),
  }),
  execute: async ({ bankName }) => {
    const rows = await db
      .select()
      .from(fdPolicies)
      .where(ilike(fdPolicies.bankName, `%${bankName}%`))
      .limit(1);
    if (!rows.length) {
      return { found: false, message: `No rate-card on file for "${bankName}".` };
    }
    const r = rows[0];
    return {
      found: true,
      bankName: r.bankName,
      bankType: r.bankType,
      rateRegular: Number(r.rateRegular),
      rateSenior: Number(r.rateSenior),
      minDeposit: r.minDeposit,
      maxTenorDays: r.maxTenorDays,
      prematurePenalty: Number(r.prematurePenalty),
      dicgcCovered: r.dicgcCovered,
      rbiLicensed: r.rbiLicensed,
      taxSaverAvailable: r.taxSaverAvailable,
      notes: r.notes,
    };
  },
});

export const explainTermTool = tool({
  description:
    'Look up a financial term (e.g. "DICGC", "TDS", "tenor", "premature_withdrawal") in the multilingual glossary. Returns a definition plus an everyday analogy.',
  parameters: z.object({
    term: z.string().describe('The financial term to explain'),
    language: z
      .enum(['hi', 'bho', 'mai', 'mr', 'bn', 'as', 'or', 'gu', 'pa', 'ur', 'ta', 'te', 'kn', 'ml', 'en'])
      .default('hi')
      .describe("User's preferred language"),
  }),
  execute: async ({ term, language }) => {
    const definition = lookupTerm(term, language as Language);
    if (!definition) {
      return { found: false, term, message: `No glossary entry for "${term}".` };
    }
    return { found: true, term, definition };
  },
});

export const initiateBookingTool = tool({
  description:
    'Start an FD booking flow for a chosen bank and amount. Returns a session object with the steps the user will go through (rate confirmation → KYC check → nominee → deposit → confirmation).',
  parameters: z.object({
    bankName: z.string().describe('Bank where the FD will be booked'),
    principal: z.number().positive().describe('Amount in INR'),
    tenorYears: z.number().positive().describe('Tenor in years'),
  }),
  execute: async ({ bankName, principal, tenorYears }) => ({
    bookingId: `book_${Math.random().toString(36).slice(2, 10)}`,
    bankName,
    principal,
    tenorYears,
    status: 'pending_user_confirmation',
    steps: [
      { id: 1, name: 'Rate confirmation', status: 'pending' },
      { id: 2, name: 'KYC / VKYC verification', status: 'pending' },
      { id: 3, name: 'Nominee details', status: 'pending' },
      { id: 4, name: 'Funds transfer', status: 'pending' },
      { id: 5, name: 'FD certificate generation', status: 'pending' },
    ],
    disclosure:
      'Deposit insured by DICGC up to ₹5,00,000 per depositor per bank. Premature withdrawal penalty applies. Rate locked at booking; senior citizen rate applied automatically if eligible.',
  }),
});

export const advisorTools = {
  calculate_maturity: calculateMaturityTool,
  get_fd_rates: getFdRatesTool,
  explain_term: explainTermTool,
  initiate_booking: initiateBookingTool,
};

export type AdvisorTools = typeof advisorTools;
