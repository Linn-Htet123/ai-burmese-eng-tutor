import type { Level, ReviewItem } from "@may/shared";
import { LEVEL_LABEL_MY } from "@may/shared";

/**
 * Memory Management (book ch. 8) applied to D-046:
 *  - long-term chart  = persistent memory from Postgres, rebuilt for every stage context
 *  - short-term handover = working memory the conductor accumulates during this session
 * Both are plain text with a hard character cap, because every stage pays for them again.
 */

export interface LearnerChart {
  name: string;
  level: Level;
  interests: string[];
  weakPoints: string[];
  lastRecap: ReviewItem[];
  profileFacts: string[];
  daysSinceLastSession: number | null;
}

export const LONG_TERM_CAP = 900;
export const SHORT_TERM_CAP = 600;

/** Per-list bounds so one long list can never push the recap promise past the cap. */
const MAX_LIST = 5;

export function buildLongTermChart(c: LearnerChart): string {
  const few = (xs: readonly string[]) => xs.slice(0, MAX_LIST);
  // Ordered by importance: the recap promise (R-RC-3) and the return-session rule come first.
  const lines = [
    `Learner: ${c.name}. Level: ${c.level} (${LEVEL_LABEL_MY[c.level]}).`,
    c.lastRecap.length
      ? `Last session's three: ${c.lastRecap.slice(0, 3).map((r) => `"${r.target}"`).join(", ")}. Bring them back explicitly.`
      : "First session: no recap items yet.",
    c.daysSinceLastSession !== null && c.daysSinceLastSession >= 7
      ? `Away ${c.daysSinceLastSession} days: keep it easy, make sure of one win.`
      : null,
    c.interests.length ? `Likes: ${few(c.interests).join(", ")}.` : null,
    c.weakPoints.length ? `Slows down on: ${few(c.weakPoints).join("; ")}.` : null,
    c.profileFacts.length ? `Facts: ${few(c.profileFacts).join("; ")}.` : null,
  ].filter((l): l is string => Boolean(l));
  return cap(lines.join("\n"), LONG_TERM_CAP);
}

/** Newest notes win when the cap bites: the last stage's note matters most to the next. */
export function buildShortTermHandover(notes: readonly string[]): string {
  if (notes.length === 0) return "Nothing yet this session.";
  const kept: string[] = [];
  let size = 0;
  for (let i = notes.length - 1; i >= 0; i -= 1) {
    const n = notes[i] ?? "";
    if (size + n.length + 1 > SHORT_TERM_CAP && kept.length > 0) break;
    kept.unshift(n);
    size += n.length + 1;
  }
  return cap(kept.map((n, i) => `${i + 1}. ${n}`).join("\n"), SHORT_TERM_CAP);
}

export function cap(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
