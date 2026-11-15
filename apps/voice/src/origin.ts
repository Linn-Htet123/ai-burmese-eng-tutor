/** Every call spends Gemini tokens, so production must pin the browser origins (ALLOWED_ORIGINS). */
export function originAllowed(origin: string | undefined, allowed: readonly string[]): boolean {
  if (allowed.length === 0) return true;
  return origin !== undefined && allowed.includes(origin);
}
