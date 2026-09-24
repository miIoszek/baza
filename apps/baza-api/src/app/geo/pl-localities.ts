import {
  LOCALITY_QUERY_MIN_LENGTH,
  LOCALITY_SEARCH_LIMIT,
  type LocalitySuggestion,
} from '@baza/shared-types';
import data from './data/pl-localities.json';

/** Shape of data/pl-localities.json (built by scripts/build-pl-localities.mjs from PRNG). */
interface PlLocalitiesFile {
  source: string;
  kinds: string[];
  /** [gmina, powiat, voivodeship] */
  areas: [string, string, string][];
  /** [SIMC id, name, kind index, area index, lat, lng] */
  places: [string, string, number, number, number, number][];
}

interface IndexedPlace extends LocalitySuggestion {
  /** Normalised name, for prefix matching. */
  key: string;
  /** Normalised words of gmina, powiat and voivodeship ("Nowa Wieś Wschowa"). */
  areaWords: string[];
  /** Lower comes first: cities with county rights, other towns, villages, … */
  rank: number;
}

const collator = new Intl.Collator('pl');
let index: IndexedPlace[] | null = null;

/** "Bielsko-Biała" → "bielsko biala": lower case, no Polish letters or punctuation. */
export function normalizeName(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** "gm. Kórnik, pow. poznański, woj. wielkopolskie" — a gmina or powiat named like the place is left out. */
export function areaLabel(name: string, [gmina, powiat, voivodeship]: [string, string, string]): string {
  return [
    gmina !== name ? `gm. ${gmina}` : null,
    powiat !== name ? `pow. ${powiat}` : null,
    `woj. ${voivodeship}`,
  ]
    .filter(Boolean)
    .join(', ');
}

function buildIndex(): IndexedPlace[] {
  const file = data as unknown as PlLocalitiesFile;
  return file.places.map(([id, name, kindIdx, areaIdx, lat, lng]) => {
    const area = file.areas[areaIdx];
    const kind = file.kinds[kindIdx];
    // No population in PRNG: a town that is its own county (Poznań, Kraków) stands in for "big".
    const rank = kind === 'miasto' ? (area[1] === name ? 0 : 1) : kindIdx + 1;
    return {
      id,
      name,
      kind,
      area: areaLabel(name, area),
      lat,
      lng,
      key: normalizeName(name),
      areaWords: normalizeName(area.join(' ')).split(' '),
      rank,
    };
  });
}

function places(): IndexedPlace[] {
  index ??= buildIndex();
  return index;
}

/** Big places first ("bielsko" → Bielsko-Biała before the villages called Bielsko), then exact names. */
function byRelevance(query: string) {
  return (a: IndexedPlace, b: IndexedPlace): number =>
    a.rank - b.rank ||
    Number(b.key === query) - Number(a.key === query) ||
    a.key.length - b.key.length ||
    collator.compare(a.name, b.name) ||
    collator.compare(a.area, b.area);
}

/**
 * Localities whose name starts with the query ("pozn" → Poznań). When nothing does, the
 * last words narrow down gmina, powiat or voivodeship instead ("Nowa Wieś Wschowa").
 */
export function searchLocalities(
  query: string,
  limit = LOCALITY_SEARCH_LIMIT
): LocalitySuggestion[] {
  const q = normalizeName(query);
  if (q.length < LOCALITY_QUERY_MIN_LENGTH) {
    return [];
  }
  const all = places();
  let hits = all.filter((p) => p.key.startsWith(q));
  const words = q.split(' ');
  for (let n = words.length - 1; n >= 1 && hits.length === 0; n--) {
    const name = words.slice(0, n).join(' ');
    const rest = words.slice(n);
    hits = all.filter(
      (p) => p.key.startsWith(name) && rest.every((w) => p.areaWords.some((a) => a.startsWith(w)))
    );
  }
  return hits
    .sort(byRelevance(q))
    .slice(0, limit)
    .map(({ id, name, kind, area, lat, lng }) => ({ id, name, kind, area, lat, lng }));
}
