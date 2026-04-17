/** Trim and collapse whitespace for message send / voice merge */
export function sanitizeMessage(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
