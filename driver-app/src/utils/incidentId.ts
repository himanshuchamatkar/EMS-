/** Cosmetic short form of an emergency's UUID for display, e.g. "INC-8492-A". */
export function formatIncidentId(id: string): string {
  const clean = id.replace(/-/g, '').toUpperCase();
  return `INC-${clean.slice(0, 4)}-${clean.slice(4, 5)}`;
}
