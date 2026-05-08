/**
 * Source-authority hierarchy for citation badges.
 *
 * Indian retail-finance documents have very different *trust weights*. RBI
 * circulars are the regulatory bedrock; DICGC documents are the deposit-
 * insurance authority; bank brochures describe one bank's specific product;
 * and user-uploaded documents have unknown provenance. This file is the one
 * place that maps a `faissSessionId` (and, as a fallback, the rendered doc
 * title) to a tiered authority label.
 *
 * Tier weights are used for sorting in the source drawer / "View all sources"
 * list so the most authoritative chunks bubble to the top regardless of
 * their cross-encoder score.
 */
import type { Language } from '@/store/app-store';
import { t as translate } from '@/lib/i18n';

export type AuthorityTier =
  | 'rbi'
  | 'dicgc'
  | 'tax'
  | 'sebi'
  | 'rate_card'
  | 'bank'
  | 'upload'
  | 'other';

export type AuthorityInfo = {
  tier: AuthorityTier;
  /** A short label like "RBI" / "DICGC" / "Bank brochure" / "Tax rule" */
  label: string;
  /** A longer, trust-tinted description like "Verified RBI Source". */
  trustLabel: string;
  /** Higher = more authoritative. RBI = 100, DICGC = 95, etc. */
  weight: number;
  /** Tailwind color name used for the dot/stripe. */
  color: 'sky' | 'emerald' | 'violet' | 'amber' | 'indigo' | 'slate' | 'rose';
};

const TIER_TABLE: Record<AuthorityTier, Omit<AuthorityInfo, 'label' | 'trustLabel'>> = {
  rbi: { tier: 'rbi', weight: 100, color: 'sky' },
  dicgc: { tier: 'dicgc', weight: 95, color: 'emerald' },
  tax: { tier: 'tax', weight: 85, color: 'violet' },
  sebi: { tier: 'sebi', weight: 80, color: 'rose' },
  rate_card: { tier: 'rate_card', weight: 70, color: 'amber' },
  bank: { tier: 'bank', weight: 60, color: 'indigo' },
  upload: { tier: 'upload', weight: 30, color: 'slate' },
  other: { tier: 'other', weight: 0, color: 'slate' },
};

/**
 * Classify a chunk's authority by `faissSessionId` and (as a fallback)
 * `doc` title. Heuristic, but driven by the well-known KB session naming
 * convention used in `rag_backend/startup/preload_kb.py`.
 */
export function classifyAuthority(
  faissSessionId: string | undefined | null,
  doc?: string | null,
): AuthorityTier {
  const sid = (faissSessionId ?? '').toLowerCase();
  const d = (doc ?? '').toLowerCase();

  // Synthetic rate-card injection wins immediately.
  if (sid === 'rate_card_db' || d.includes('rate-card')) return 'rate_card';

  // KB session prefixes
  if (sid.includes('rbi')) return 'rbi';
  if (sid.includes('dicgc')) return 'dicgc';
  if (sid.includes('tax') || sid.includes('194a')) return 'tax';
  if (sid.includes('sebi') || sid.includes('kyc')) return 'sebi';
  if (sid.startsWith('kb_upload_')) return 'upload';

  // SFB / scheduled-bank brochures
  if (
    sid.includes('suryoday') ||
    sid.includes('ujjivan') ||
    sid.includes('esaf') ||
    sid.includes('equitas') ||
    sid.includes('au_sfb') ||
    sid.includes('hdfc') ||
    sid.includes('icici') ||
    sid.includes('axis') ||
    sid.includes('sbi') ||
    sid.includes('_sfb') ||
    sid.includes('bank')
  ) {
    return 'bank';
  }

  // Fallback to doc title
  if (d.includes('rbi')) return 'rbi';
  if (d.includes('dicgc')) return 'dicgc';
  if (d.includes('tds') || d.includes('194a') || d.includes('tax')) return 'tax';
  if (d.includes('sebi') || d.includes('kyc')) return 'sebi';
  if (d.includes('brochure') || d.includes('rate-card')) return 'bank';

  return 'other';
}

const TIER_TO_I18N_KEY: Record<AuthorityTier, { label: string; trust: string }> = {
  rbi: { label: 'authority.rbi', trust: 'authority.rbi.trust' },
  dicgc: { label: 'authority.dicgc', trust: 'authority.dicgc.trust' },
  tax: { label: 'authority.tax', trust: 'authority.tax.trust' },
  sebi: { label: 'authority.sebi', trust: 'authority.sebi.trust' },
  rate_card: { label: 'authority.rate_card', trust: 'authority.rate_card.trust' },
  bank: { label: 'authority.bank', trust: 'authority.bank.trust' },
  upload: { label: 'authority.upload', trust: 'authority.upload.trust' },
  other: { label: 'authority.other', trust: 'authority.other.trust' },
};

export function getAuthorityInfo(
  faissSessionId: string | undefined | null,
  doc: string | undefined | null,
  language: Language,
): AuthorityInfo {
  const tier = classifyAuthority(faissSessionId, doc);
  const meta = TIER_TABLE[tier];
  const keys = TIER_TO_I18N_KEY[tier];
  return {
    ...meta,
    label: translate(keys.label, language),
    trustLabel: translate(keys.trust, language),
  };
}

/**
 * Tailwind class strings for the per-authority color of dots / stripes /
 * badges. Designed to look good in both light and dark themes (CSS vars
 * are inverted in `:root.dark`, so the color *names* are theme-stable).
 */
export const AUTHORITY_COLOR_CLASSES: Record<
  AuthorityInfo['color'],
  { dot: string; chip: string; ring: string }
> = {
  sky: {
    dot: 'bg-sky-400',
    chip: 'bg-sky-500/15 text-sky-200 border-sky-400/40',
    ring: 'ring-sky-400/40',
  },
  emerald: {
    dot: 'bg-emerald-400',
    chip: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40',
    ring: 'ring-emerald-400/40',
  },
  violet: {
    dot: 'bg-violet-400',
    chip: 'bg-violet-500/15 text-violet-200 border-violet-400/40',
    ring: 'ring-violet-400/40',
  },
  amber: {
    dot: 'bg-amber-400',
    chip: 'bg-amber-500/15 text-amber-200 border-amber-400/40',
    ring: 'ring-amber-400/40',
  },
  indigo: {
    dot: 'bg-indigo-400',
    chip: 'bg-indigo-500/15 text-indigo-200 border-indigo-400/40',
    ring: 'ring-indigo-400/40',
  },
  slate: {
    dot: 'bg-slate-400',
    chip: 'bg-slate-500/15 text-slate-300 border-slate-400/40',
    ring: 'ring-slate-400/40',
  },
  rose: {
    dot: 'bg-rose-400',
    chip: 'bg-rose-500/15 text-rose-200 border-rose-400/40',
    ring: 'ring-rose-400/40',
  },
};
