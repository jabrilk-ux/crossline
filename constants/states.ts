export interface StateInfo {
  code: string;
  name: string;
  statuteUrl: string;
}

export const STATES: StateInfo[] = [
  { code: 'AL', name: 'Alabama',        statuteUrl: 'https://alison.legislature.state.al.us' },
  { code: 'AK', name: 'Alaska',         statuteUrl: 'https://www.akleg.gov' },
  { code: 'AZ', name: 'Arizona',        statuteUrl: 'https://www.azleg.gov' },
  { code: 'AR', name: 'Arkansas',       statuteUrl: 'https://www.arkleg.state.ar.us' },
  { code: 'CA', name: 'California',     statuteUrl: 'https://leginfo.legislature.ca.gov' },
  { code: 'CO', name: 'Colorado',       statuteUrl: 'https://leg.colorado.gov' },
  { code: 'CT', name: 'Connecticut',    statuteUrl: 'https://www.cga.ct.gov' },
  { code: 'DE', name: 'Delaware',       statuteUrl: 'https://legis.delaware.gov' },
  { code: 'FL', name: 'Florida',        statuteUrl: 'https://www.flsenate.gov' },
  { code: 'GA', name: 'Georgia',        statuteUrl: 'https://www.legis.ga.gov' },
  { code: 'HI', name: 'Hawaii',         statuteUrl: 'https://www.capitol.hawaii.gov' },
  { code: 'ID', name: 'Idaho',          statuteUrl: 'https://legislature.idaho.gov' },
  { code: 'IL', name: 'Illinois',       statuteUrl: 'https://www.ilga.gov' },
  { code: 'IN', name: 'Indiana',        statuteUrl: 'https://iga.in.gov' },
  { code: 'IA', name: 'Iowa',           statuteUrl: 'https://www.legis.iowa.gov' },
  { code: 'KS', name: 'Kansas',         statuteUrl: 'https://www.kslegislature.org' },
  { code: 'KY', name: 'Kentucky',       statuteUrl: 'https://legislature.ky.gov' },
  { code: 'LA', name: 'Louisiana',      statuteUrl: 'https://www.legis.la.gov' },
  { code: 'ME', name: 'Maine',          statuteUrl: 'https://legislature.maine.gov' },
  { code: 'MD', name: 'Maryland',       statuteUrl: 'https://mgaleg.maryland.gov' },
  { code: 'MA', name: 'Massachusetts',  statuteUrl: 'https://malegislature.gov' },
  { code: 'MI', name: 'Michigan',       statuteUrl: 'https://www.legislature.mi.gov' },
  { code: 'MN', name: 'Minnesota',      statuteUrl: 'https://www.revisor.mn.gov' },
  { code: 'MS', name: 'Mississippi',    statuteUrl: 'https://www.legislature.ms.gov' },
  { code: 'MO', name: 'Missouri',       statuteUrl: 'https://www.moga.mo.gov' },
  { code: 'MT', name: 'Montana',        statuteUrl: 'https://leg.mt.gov' },
  { code: 'NE', name: 'Nebraska',       statuteUrl: 'https://nebraskalegislature.gov' },
  { code: 'NV', name: 'Nevada',         statuteUrl: 'https://www.leg.state.nv.us' },
  { code: 'NH', name: 'New Hampshire',  statuteUrl: 'https://www.gencourt.state.nh.us' },
  { code: 'NJ', name: 'New Jersey',     statuteUrl: 'https://www.njleg.state.nj.us' },
  { code: 'NM', name: 'New Mexico',     statuteUrl: 'https://www.nmlegis.gov' },
  { code: 'NY', name: 'New York',       statuteUrl: 'https://www.nysenate.gov' },
  { code: 'NC', name: 'North Carolina', statuteUrl: 'https://www.ncleg.gov' },
  { code: 'ND', name: 'North Dakota',   statuteUrl: 'https://www.legis.nd.gov' },
  { code: 'OH', name: 'Ohio',           statuteUrl: 'https://www.legislature.ohio.gov' },
  { code: 'OK', name: 'Oklahoma',       statuteUrl: 'https://www.oscn.net' },
  { code: 'OR', name: 'Oregon',         statuteUrl: 'https://www.oregonlegislature.gov' },
  { code: 'PA', name: 'Pennsylvania',   statuteUrl: 'https://www.legis.state.pa.us' },
  { code: 'RI', name: 'Rhode Island',   statuteUrl: 'https://www.rilegislature.gov' },
  { code: 'SC', name: 'South Carolina', statuteUrl: 'https://www.scstatehouse.gov' },
  { code: 'SD', name: 'South Dakota',   statuteUrl: 'https://sdlegislature.gov' },
  { code: 'TN', name: 'Tennessee',      statuteUrl: 'https://www.capitol.tn.gov' },
  { code: 'TX', name: 'Texas',          statuteUrl: 'https://www.capitol.texas.gov' },
  { code: 'UT', name: 'Utah',           statuteUrl: 'https://le.utah.gov' },
  { code: 'VT', name: 'Vermont',        statuteUrl: 'https://legislature.vermont.gov' },
  { code: 'VA', name: 'Virginia',       statuteUrl: 'https://law.lis.virginia.gov' },
  { code: 'WA', name: 'Washington',     statuteUrl: 'https://app.leg.wa.gov' },
  { code: 'WV', name: 'West Virginia',  statuteUrl: 'https://www.wvlegislature.gov' },
  { code: 'WI', name: 'Wisconsin',      statuteUrl: 'https://docs.legis.wisconsin.gov' },
  { code: 'WY', name: 'Wyoming',        statuteUrl: 'https://www.wyoleg.gov' },
  { code: 'DC', name: 'Washington D.C.', statuteUrl: 'https://code.dccouncil.gov' },
];

export const STATE_MAP = Object.fromEntries(STATES.map(s => [s.code, s])) as Record<string, StateInfo>;

export function getStateName(code: string): string {
  return STATE_MAP[code]?.name ?? code;
}
