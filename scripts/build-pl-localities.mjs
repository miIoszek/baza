// Builds apps/baza-api/src/app/geo/data/pl-localities.json from the PRNG localities
// register (Państwowy Rejestr Nazw Geograficznych, GUGiK — open data).
//
//   curl -LO https://opendata.geoportal.gov.pl/prng/PRNG_MIEJSCOWOSCI_SHP.zip   (~20 MB)
//   unzip PRNG_MIEJSCOWOSCI_SHP.zip PRNG_MIEJSCOWOSCI_SHP.dbf                     (~830 MB)
//   node scripts/build-pl-localities.mjs path/to/PRNG_MIEJSCOWOSCI_SHP.dbf [export date]
//
// Keeps towns, villages, settlements, colonies and hamlets with an official name
// (about 52 000); parts of towns and villages and forestry lodges only add noise
// to the base-address suggestions. Coordinates come from the `wspGeograf` column
// (degrees, minutes, seconds), rounded to 4 decimals (~10 m).
import { closeSync, openSync, readSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KINDS = ['miasto', 'wieś', 'osada', 'kolonia', 'przysiółek'];
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../apps/baza-api/src/app/geo/data/pl-localities.json'
);

const [dbfPath, exportDate = new Date().toISOString().slice(0, 10)] = process.argv.slice(2);
if (!dbfPath) {
  console.error('Usage: node scripts/build-pl-localities.mjs PRNG_MIEJSCOWOSCI_SHP.dbf [export date]');
  process.exit(1);
}

/** Streams the dBASE file and yields the wanted text columns of each live record. */
function* readDbf(file, wanted) {
  const fd = openSync(file, 'r');
  const head = Buffer.alloc(32);
  readSync(fd, head, 0, 32, 0);
  const count = head.readUInt32LE(4);
  const headerLen = head.readUInt16LE(8);
  const recordLen = head.readUInt16LE(10);
  const header = Buffer.alloc(headerLen);
  readSync(fd, header, 0, headerLen, 0);
  const fields = [];
  let offset = 1; // each record starts with a deletion flag
  for (let o = 32; header[o] !== 0x0d; o += 32) {
    fields.push({
      name: header.toString('latin1', o, o + 11).replace(/\0.*$/, ''),
      offset,
      len: header[o + 16],
    });
    offset += header[o + 16];
  }
  const picked = fields.filter((f) => wanted.includes(f.name));
  const batch = 2000;
  const buf = Buffer.alloc(recordLen * batch);
  for (let i = 0; i < count; i += batch) {
    const n = Math.min(batch, count - i);
    readSync(fd, buf, 0, recordLen * n, headerLen + i * recordLen);
    for (let r = 0; r < n; r++) {
      const base = r * recordLen;
      if (buf[base] === 0x2a) continue; // deleted record
      const rec = {};
      for (const f of picked) {
        rec[f.name] = buf.toString('utf8', base + f.offset, base + f.offset + f.len).trim();
      }
      yield rec;
    }
  }
  closeSync(fd);
}

/** `52°15'01" 17°05'16"` → [52.2503, 17.0878] */
function parseDms(text) {
  const parts = [...text.matchAll(/(\d+)°(\d+)'(\d+(?:[.,]\d+)?)"/g)].map(
    ([, d, m, s]) => Number(d) + Number(m) / 60 + Number(s.replace(',', '.')) / 3600
  );
  if (parts.length !== 2 || parts.some((v) => !Number.isFinite(v))) {
    return null;
  }
  return parts.map((v) => Math.round(v * 1e4) / 1e4);
}

const areas = [];
const areaIndex = new Map();
const places = [];
let skipped = 0;

for (const r of readDbf(dbfPath, [
  'nazwaGlown',
  'rodzaj',
  'statusNazw',
  'systemZewn',
  'idZewnetrz',
  'wspGeograf',
  'wojewodz',
  'powiat',
  'gmina',
])) {
  const kind = KINDS.indexOf(r.rodzaj);
  if (kind < 0 || r.statusNazw !== 'urzędowa') {
    continue;
  }
  const coords = parseDms(r.wspGeograf);
  if (!coords || !r.nazwaGlown) {
    skipped++;
    continue;
  }
  // "Kórnik-gmina miejsko-wiejska" → "Kórnik"
  const area = [r.gmina.replace(/-gmina.*$/, ''), r.powiat, r.wojewodz];
  const key = area.join('|');
  let idx = areaIndex.get(key);
  if (idx === undefined) {
    idx = areas.length;
    areas.push(area);
    areaIndex.set(key, idx);
  }
  const simc = r.systemZewn === 'TERYT (SIMC)' ? r.idZewnetrz : '';
  places.push([simc, r.nazwaGlown, kind, idx, coords[0], coords[1]]);
}

const collator = new Intl.Collator('pl');
places.sort((a, b) => collator.compare(a[1], b[1]) || a[2] - b[2] || collator.compare(a[0], b[0]));

writeFileSync(
  OUT,
  JSON.stringify({
    source: `PRNG — Państwowy Rejestr Nazw Geograficznych (GUGiK), eksport z ${exportDate}`,
    kinds: KINDS,
    areas,
    places,
  }) + '\n'
);
const perKind = KINDS.map((k, i) => `${k}: ${places.filter((p) => p[2] === i).length}`).join(', ');
console.log(`${places.length} places (${perKind}), ${areas.length} areas, ${skipped} skipped → ${OUT}`);
