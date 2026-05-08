import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  integer,
  numeric,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Chat sessions. One row per logical conversation.
 * `kbSessionIds` mirrors the FAISS session IDs that are active for this chat.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    title: text('title').default('नई बातचीत').notNull(),
    language: varchar('language', { length: 8 }).default('hi').notNull(),
    kbSessionIds: jsonb('kb_session_ids').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('sessions_user_idx').on(t.userId),
    updatedIdx: index('sessions_updated_idx').on(t.updatedAt),
  }),
);

/**
 * Individual chat turns. `sources` carries citation chunks.
 */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .references(() => sessions.id, { onDelete: 'cascade' })
      .notNull(),
    role: varchar('role', { length: 16 }).notNull(),
    content: text('content').notNull(),
    sources: jsonb('sources').$type<MessageSource[]>().default([]).notNull(),
    confidence: varchar('confidence', { length: 16 }).default('medium').notNull(),
    toolCalls: jsonb('tool_calls').$type<unknown[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sessionIdx: index('messages_session_idx').on(t.sessionId),
  }),
);

/**
 * Master rate-card / policy table. Seeded for the 7 banks.
 */
export const fdPolicies = pgTable('fd_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  bankName: varchar('bank_name', { length: 128 }).notNull().unique(),
  bankType: varchar('bank_type', { length: 64 }).notNull(),
  rateRegular: numeric('rate_regular', { precision: 5, scale: 2 }).notNull(),
  rateSenior: numeric('rate_senior', { precision: 5, scale: 2 }).notNull(),
  minDeposit: integer('min_deposit').default(1000).notNull(),
  maxTenorDays: integer('max_tenor_days').default(3650).notNull(),
  prematurePenalty: numeric('premature_penalty', { precision: 5, scale: 2 }).default('1.00').notNull(),
  dicgcCovered: boolean('dicgc_covered').default(true).notNull(),
  rbiLicensed: boolean('rbi_licensed').default(true).notNull(),
  taxSaverAvailable: boolean('tax_saver_available').default(false).notNull(),
  faissSessionId: varchar('faiss_session_id', { length: 64 }),
  notes: text('notes'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Compare workbench saved sessions for analytics.
 */
export const compareSessions = pgTable('compare_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 191 }).notNull(),
  policyIds: jsonb('policy_ids').$type<string[]>().default([]).notNull(),
  query: text('query').notNull(),
  results: jsonb('results').$type<unknown>().default({}).notNull(),
  summary: text('summary'),
  language: varchar('language', { length: 8 }).default('hi').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Knowledge Base document registry. The Knowledge Explorer UI reads from here.
 */
export const kbDocuments = pgTable('kb_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  faissSessionId: varchar('faiss_session_id', { length: 64 }).notNull().unique(),
  title: text('title').notNull(),
  source: varchar('source', { length: 128 }).notNull(),
  category: varchar('category', { length: 64 }).notNull(),
  filePath: text('file_path'),
  pageCount: integer('page_count').default(0).notNull(),
  chunkCount: integer('chunk_count').default(0).notNull(),
  language: varchar('language', { length: 8 }).default('en').notNull(),
  indexedAt: timestamp('indexed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Booking flow stub for Demo Moment 3 (not the headline feature).
 */
export const bookingAttempts = pgTable('booking_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 191 }).notNull(),
  policyId: uuid('policy_id')
    .references(() => fdPolicies.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 32 }).default('initiated').notNull(),
  amount: integer('amount'),
  tenorDays: integer('tenor_days'),
  steps: jsonb('steps').$type<unknown[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type MessageSource = {
  index: number;
  doc: string;
  page: number;
  score: number;
  faissSessionId: string;
  chunkText: string;
  /** Cross-encoder rerank score (0–1 sigmoid). Optional — older messages may
   *  not have these. */
  rerankScore?: number | null;
  denseScore?: number | null;
  rrfScore?: number | null;
};

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type FdPolicy = typeof fdPolicies.$inferSelect;
export type NewFdPolicy = typeof fdPolicies.$inferInsert;
export type KbDocument = typeof kbDocuments.$inferSelect;
export type NewKbDocument = typeof kbDocuments.$inferInsert;
