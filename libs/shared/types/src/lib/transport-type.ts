export type TransportType =
  | 'curtain'
  | 'reefer'
  | 'tanker'
  | 'tipper'
  | 'container'
  | 'flatbed'
  | 'low_loader'
  | 'car_transporter'
  | 'silo'
  | 'hds'
  | 'bus'
  | 'van'
  | 'other';

export interface TransportTypeOption {
  code: TransportType;
  namePl: string;
}

export const TRANSPORT_TYPES: readonly TransportTypeOption[] = [
  { code: 'curtain', namePl: 'Plandeka / firanka' },
  { code: 'reefer', namePl: 'Chłodnia / izoterma' },
  { code: 'tanker', namePl: 'Cysterna' },
  { code: 'tipper', namePl: 'Wywrotka' },
  { code: 'container', namePl: 'Kontener' },
  { code: 'flatbed', namePl: 'Platforma' },
  { code: 'low_loader', namePl: 'Niskopodwozie' },
  { code: 'car_transporter', namePl: 'Autowóz (przewóz aut)' },
  { code: 'silo', namePl: 'Silos' },
  { code: 'hds', namePl: 'HDS / dźwig' },
  { code: 'bus', namePl: 'Bus / busy' },
  { code: 'van', namePl: 'Dostawcze' },
  { code: 'other', namePl: 'Inne' },
] as const;

export const TRANSPORT_TYPE_CODES: readonly TransportType[] = TRANSPORT_TYPES.map(
  (t) => t.code
);

export function isTransportType(value: string): value is TransportType {
  return (TRANSPORT_TYPE_CODES as readonly string[]).includes(value);
}
