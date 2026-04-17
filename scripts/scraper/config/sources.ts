// ─── State statute source URLs ────────────────────────────────────────────────
//
// Priority states for the Session 8 seed run:
//   VA, MD, PA (already seeded manually — scraper will overwrite with verified data)
//   TX, FL, CA, NY, GA, AZ, OH, NV, TN
//
// URL notes:
//   - Use official legislature sites where stable direct URLs exist
//   - justia.com used as stable fallback for states with unwieldy official URLs
//   - Omit a category key entirely if the state has no law for that category
//   - Sources are fetched live; verify URLs are still valid before running

export type LawCategory =
  | 'carry'
  | 'reciprocity'
  | 'duty_to_inform'
  | 'prohibited_locations'
  | 'transport'
  | 'magazine'
  | 'ammo'
  | 'use_of_force'
  | 'red_flag'
  | 'storage';

export interface StateSourceConfig {
  stateCode: string;
  stateName: string;
  sources: Partial<Record<LawCategory, string>>;
}

export const STATE_SOURCES: StateSourceConfig[] = [

  // ── Virginia ────────────────────────────────────────────────────────────────
  {
    stateCode: 'VA',
    stateName: 'Virginia',
    sources: {
      carry:               'https://law.lis.virginia.gov/vacode/title18.2/chapter7/section18.2-308.02/',
      prohibited_locations:'https://law.lis.virginia.gov/vacode/title18.2/chapter7/section18.2-308.01/',
      transport:           'https://law.lis.virginia.gov/vacode/title18.2/chapter7/section18.2-308/',
      red_flag:            'https://law.lis.virginia.gov/vacode/title19.2/chapter8/section19.2-152.13/',
      use_of_force:        'https://law.lis.virginia.gov/vacode/title18.2/chapter4/section18.2-51.1/',
    },
  },

  // ── Maryland ─────────────────────────────────────────────────────────────────
  {
    stateCode: 'MD',
    stateName: 'Maryland',
    sources: {
      carry:               'https://law.justia.com/codes/maryland/public-safety/title-5/subtitle-3/section-5-306/',
      magazine:            'https://law.justia.com/codes/maryland/public-safety/title-5/subtitle-6/section-5-606/',
      transport:           'https://law.justia.com/codes/maryland/public-safety/title-5/subtitle-3/section-5-302/',
      duty_to_inform:      'https://law.justia.com/codes/maryland/public-safety/title-5/subtitle-3/section-5-310/',
      prohibited_locations:'https://law.justia.com/codes/maryland/public-safety/title-5/subtitle-3/section-5-306/',
      red_flag:            'https://law.justia.com/codes/maryland/public-safety/title-5/subtitle-6/section-5-601/',
    },
  },

  // ── Pennsylvania ─────────────────────────────────────────────────────────────
  {
    stateCode: 'PA',
    stateName: 'Pennsylvania',
    sources: {
      carry:               'https://www.legis.state.pa.us/cfdocs/legis/LI/consCheck.cfm?txtType=HTM&ttl=18&div=0&chpt=61&sctn=6&subsctn=0',
      prohibited_locations:'https://www.legis.state.pa.us/cfdocs/legis/LI/consCheck.cfm?txtType=HTM&ttl=18&div=0&chpt=61&sctn=12&subsctn=0',
      transport:           'https://law.justia.com/codes/pennsylvania/title-75-vehicles/chapter-61-equipment-standards/section-6106.1/',
      duty_to_inform:      'https://law.justia.com/codes/pennsylvania/title-18-crimes-and-offenses/chapter-61-firearms/section-6118/',
      storage:             'https://law.justia.com/codes/pennsylvania/title-18-crimes-and-offenses/chapter-61-firearms/section-6110.2/',
    },
  },

  // ── Texas ─────────────────────────────────────────────────────────────────────
  {
    stateCode: 'TX',
    stateName: 'Texas',
    sources: {
      carry:               'https://statutes.capitol.texas.gov/Docs/PE/htm/PE.46.htm',
      prohibited_locations:'https://statutes.capitol.texas.gov/Docs/PE/htm/PE.46.htm',
      transport:           'https://statutes.capitol.texas.gov/Docs/PE/htm/PE.46.htm',
      duty_to_inform:      'https://statutes.capitol.texas.gov/Docs/PE/htm/PE.46.htm',
      use_of_force:        'https://statutes.capitol.texas.gov/Docs/PE/htm/PE.9.htm',
    },
  },

  // ── Florida ───────────────────────────────────────────────────────────────────
  {
    stateCode: 'FL',
    stateName: 'Florida',
    sources: {
      carry:               'https://www.flsenate.gov/Laws/Statutes/2023/0790.06',
      prohibited_locations:'https://www.flsenate.gov/Laws/Statutes/2023/0790.06',
      transport:           'https://www.flsenate.gov/Laws/Statutes/2023/0790.25',
      duty_to_inform:      'https://www.flsenate.gov/Laws/Statutes/2023/0790.06',
      use_of_force:        'https://www.flsenate.gov/Laws/Statutes/2023/0776.012',
      red_flag:            'https://www.flsenate.gov/Laws/Statutes/2023/0790.401',
    },
  },

  // ── California ────────────────────────────────────────────────────────────────
  {
    stateCode: 'CA',
    stateName: 'California',
    sources: {
      carry:               'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=26150.',
      magazine:            'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=32310.',
      prohibited_locations:'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=26350.',
      transport:           'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=25610.',
      ammo:                'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=30305.',
      red_flag:            'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=8100.',
      storage:             'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=25100.',
    },
  },

  // ── New York ──────────────────────────────────────────────────────────────────
  {
    stateCode: 'NY',
    stateName: 'New York',
    sources: {
      carry:               'https://www.nysenate.gov/legislation/laws/PEN/400.00',
      magazine:            'https://www.nysenate.gov/legislation/laws/PEN/265.36',
      prohibited_locations:'https://www.nysenate.gov/legislation/laws/PEN/265.01-E',
      transport:           'https://www.nysenate.gov/legislation/laws/PEN/265.00',
      ammo:                'https://www.nysenate.gov/legislation/laws/PEN/400.03',
      red_flag:            'https://www.nysenate.gov/legislation/laws/CPL/530.14',
    },
  },

  // ── Georgia ───────────────────────────────────────────────────────────────────
  {
    stateCode: 'GA',
    stateName: 'Georgia',
    sources: {
      carry:               'https://law.justia.com/codes/georgia/title-16/chapter-11/article-4/section-16-11-129/',
      prohibited_locations:'https://law.justia.com/codes/georgia/title-16/chapter-11/article-4/section-16-11-127/',
      transport:           'https://law.justia.com/codes/georgia/title-16/chapter-11/article-4/section-16-11-135/',
      duty_to_inform:      'https://law.justia.com/codes/georgia/title-16/chapter-11/article-4/section-16-11-137/',
      use_of_force:        'https://law.justia.com/codes/georgia/title-16/chapter-3/article-2/section-16-3-21/',
    },
  },

  // ── Arizona ───────────────────────────────────────────────────────────────────
  {
    stateCode: 'AZ',
    stateName: 'Arizona',
    sources: {
      carry:               'https://www.azleg.gov/viewdocument/?docName=https://www.azleg.gov/ars/13/03102.htm',
      prohibited_locations:'https://www.azleg.gov/viewdocument/?docName=https://www.azleg.gov/ars/13/03102.htm',
      transport:           'https://www.azleg.gov/viewdocument/?docName=https://www.azleg.gov/ars/13/03102.htm',
      use_of_force:        'https://www.azleg.gov/viewdocument/?docName=https://www.azleg.gov/ars/13/00404.htm',
    },
  },

  // ── Ohio ──────────────────────────────────────────────────────────────────────
  {
    stateCode: 'OH',
    stateName: 'Ohio',
    sources: {
      carry:               'https://codes.ohio.gov/ohio-revised-code/section-2923.125',
      duty_to_inform:      'https://codes.ohio.gov/ohio-revised-code/section-2923.12',
      prohibited_locations:'https://codes.ohio.gov/ohio-revised-code/section-2923.126',
      transport:           'https://codes.ohio.gov/ohio-revised-code/section-2923.16',
      use_of_force:        'https://codes.ohio.gov/ohio-revised-code/section-2901.05',
      red_flag:            'https://codes.ohio.gov/ohio-revised-code/section-2923.15',
    },
  },

  // ── Nevada ────────────────────────────────────────────────────────────────────
  {
    stateCode: 'NV',
    stateName: 'Nevada',
    sources: {
      carry:               'https://law.justia.com/codes/nevada/chapter-202/statute-202-3653/',
      prohibited_locations:'https://law.justia.com/codes/nevada/chapter-202/statute-202-3673/',
      transport:           'https://law.justia.com/codes/nevada/chapter-202/statute-202-350/',
      duty_to_inform:      'https://law.justia.com/codes/nevada/chapter-202/statute-202-3667/',
      red_flag:            'https://law.justia.com/codes/nevada/chapter-33/statute-33-0305/',
    },
  },

  // ── Tennessee ─────────────────────────────────────────────────────────────────
  {
    stateCode: 'TN',
    stateName: 'Tennessee',
    sources: {
      carry:               'https://law.justia.com/codes/tennessee/title-39/chapter-17/part-13/section-39-17-1308/',
      prohibited_locations:'https://law.justia.com/codes/tennessee/title-39/chapter-17/part-13/section-39-17-1309/',
      transport:           'https://law.justia.com/codes/tennessee/title-39/chapter-17/part-13/section-39-17-1307/',
      duty_to_inform:      'https://law.justia.com/codes/tennessee/title-39/chapter-17/part-13/section-39-17-1319/',
      use_of_force:        'https://law.justia.com/codes/tennessee/title-39/chapter-11/part-6/section-39-11-611/',
    },
  },
];

// Lookup by state code
export function getSourceConfig(stateCode: string): StateSourceConfig | undefined {
  return STATE_SOURCES.find(s => s.stateCode === stateCode);
}
