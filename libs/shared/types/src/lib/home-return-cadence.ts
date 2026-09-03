/** How often a driver returns home (MVP filter + offer field). */
export type HomeReturnCadence =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'flexible';

export const HOME_RETURN_CADENCES: readonly HomeReturnCadence[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'flexible',
] as const;
