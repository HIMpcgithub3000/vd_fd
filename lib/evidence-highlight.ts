/**
 * Detect 4+ word phrases in the assistant's answer that match verbatim text
 * inside any cited chunk. Used to render a soft underline ("evidence span")
 * in the chat bubble — the user can see exactly which sentences were
 * grounded in the retrieval.
 *
 * Algorithm: greedy left-to-right longest-match. Cheap, deterministic, no
 * LLM call. Tuned for Indian-English + Hinglish + Devanagari sentences.
 */

export type EvidenceMatch = {
  /** Half-open [start, end) char offset inside the answer. */
  start: number;
  end: number;
  /** 1-indexed source number this phrase was matched against. */
  sourceIndex: number;
};

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'is',
  'on',
  'at',
  'as',
  'by',
  'be',
  'for',
  'से',
  'का',
  'की',
  'के',
  'है',
  'और',
  'या',
  'पर',
  'में',
  'को',
  'भी',
]);

const MIN_WORDS = 4;

function tokenize(text: string): string[] {
  // Word characters across Latin + all major Indic scripts.
  return (
    text
      .toLowerCase()
      .match(
        /[a-z0-9\u0900-\u097f\u0980-\u09ff\u0a00-\u0a7f\u0a80-\u0aff\u0b00-\u0b7f\u0b80-\u0bff\u0c00-\u0c7f\u0c80-\u0cff\u0d00-\u0d7f\u0600-\u06ff]+/g,
      ) ?? []
  );
}

function meaningfulWordCount(words: string[]): number {
  return words.filter((w) => !STOPWORDS.has(w) && w.length > 2).length;
}

/**
 * Find char-offset spans in `answer` that exist verbatim (case-insensitive,
 * whitespace-tolerant) in at least one source chunk and contain `MIN_WORDS+`
 * meaningful tokens.
 */
export function findEvidenceMatches(
  answer: string,
  sources: Array<{ index: number; chunkText: string }>,
): EvidenceMatch[] {
  if (!answer || sources.length === 0) return [];

  const corpora = sources.map((s) => ({
    index: s.index,
    lower: (s.chunkText ?? '').toLowerCase(),
  }));

  const matches: EvidenceMatch[] = [];
  const answerLower = answer.toLowerCase();

  // Walk through candidate phrases by sentence first to keep search bounded.
  const sentenceBoundary = /[।॥.\n!?]/g;
  let sentenceStart = 0;
  let m: RegExpExecArray | null;
  const sentenceSpans: Array<[number, number]> = [];
  while ((m = sentenceBoundary.exec(answer)) !== null) {
    sentenceSpans.push([sentenceStart, m.index]);
    sentenceStart = m.index + 1;
  }
  if (sentenceStart < answer.length) {
    sentenceSpans.push([sentenceStart, answer.length]);
  }

  for (const [s0, s1] of sentenceSpans) {
    const sentence = answer.slice(s0, s1).trim();
    if (sentence.length < 20) continue;

    // Try to find the longest contiguous phrase in this sentence that lives
    // verbatim in a chunk. Walk windows of ~12-word phrases first; fall back
    // to ~6-word and ~4-word.
    for (const windowSize of [12, 8, MIN_WORDS]) {
      const tokens = tokenize(sentence);
      if (tokens.length < windowSize) continue;
      let found = false;
      for (let i = 0; i + windowSize <= tokens.length; i++) {
        const window = tokens.slice(i, i + windowSize);
        if (meaningfulWordCount(window) < MIN_WORDS) continue;
        const phrase = window.join(' ');
        const hit = corpora.find((c) => c.lower.includes(phrase));
        if (hit) {
          // Locate the phrase back in the original (case-preserving) sentence.
          const sentenceLower = sentence.toLowerCase();
          const localIdx = approximateLocate(sentenceLower, window);
          if (localIdx !== -1) {
            matches.push({
              start: s0 + localIdx.start,
              end: s0 + localIdx.end,
              sourceIndex: hit.index,
            });
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }
    void answerLower;
  }

  // Merge overlapping spans, keeping the lowest sourceIndex.
  matches.sort((a, b) => a.start - b.start);
  const merged: EvidenceMatch[] = [];
  for (const cur of matches) {
    const prev = merged[merged.length - 1];
    if (prev && cur.start <= prev.end) {
      prev.end = Math.max(prev.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/**
 * Locate the start..end char offsets of a token sequence inside a lower-cased
 * sentence. Tolerates whitespace differences. Returns -1 on no-match.
 */
function approximateLocate(
  sentenceLower: string,
  tokens: string[],
): { start: number; end: number } | -1 {
  if (tokens.length === 0) return -1;
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  let cursor = 0;
  while (cursor < sentenceLower.length) {
    const startIdx = sentenceLower.indexOf(first, cursor);
    if (startIdx === -1) return -1;
    // Heuristic upper bound: at most 4×length(joined) chars to find the last
    // token after the first one.
    const joined = tokens.join(' ');
    const upper = Math.min(sentenceLower.length, startIdx + joined.length * 4);
    const lastIdx = sentenceLower.indexOf(last, startIdx + first.length);
    if (lastIdx === -1 || lastIdx > upper) {
      cursor = startIdx + 1;
      continue;
    }
    return { start: startIdx, end: lastIdx + last.length };
  }
  return -1;
}

/**
 * Split a string into segments where each segment is either plain text or a
 * highlighted match. Useful for React rendering.
 */
export function splitWithEvidence(
  answer: string,
  matches: EvidenceMatch[],
): Array<{ kind: 'text' | 'evidence'; text: string; sourceIndex?: number }> {
  if (matches.length === 0) return [{ kind: 'text', text: answer }];
  const out: Array<{ kind: 'text' | 'evidence'; text: string; sourceIndex?: number }> =
    [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) {
      out.push({ kind: 'text', text: answer.slice(cursor, m.start) });
    }
    out.push({
      kind: 'evidence',
      text: answer.slice(m.start, m.end),
      sourceIndex: m.sourceIndex,
    });
    cursor = m.end;
  }
  if (cursor < answer.length) out.push({ kind: 'text', text: answer.slice(cursor) });
  return out;
}
