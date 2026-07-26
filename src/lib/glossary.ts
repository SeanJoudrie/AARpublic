// A small dictionary of common (OPSEC-neutral, general-knowledge) military
// acronyms → plain English. Used to spot jargon in what the user wrote and
// quietly explain it — the domain-specific touch a generic tool won't make.
// Definitions are intentionally plain, aimed at a civilian recruiter.

export const GLOSSARY: Record<string, string> = {
  NCO: 'Non-Commissioned Officer — a front-line leader / supervisor.',
  NCOER: 'A formal performance evaluation for enlisted leaders.',
  OER: 'A formal performance evaluation for officers.',
  ERB: 'Enlisted Record Brief — a summary of an enlisted member’s service record.',
  ORB: 'Officer Record Brief — a summary of an officer’s service record.',
  MOS: 'Military Occupational Specialty — your job/role.',
  SOP: 'Standard Operating Procedure — a documented process.',
  AAR: 'After-Action Review — a structured debrief of what worked and what didn’t.',
  PCS: 'Permanent Change of Station — a job relocation.',
  TDY: 'Temporary Duty — a short-term assignment away from home base.',
  PT: 'Physical Training.',
  ACFT: 'Army Combat Fitness Test — the fitness standard.',
  APFT: 'Army Physical Fitness Test — the fitness standard.',
  XO: 'Executive Officer — the second-in-command / deputy.',
  PL: 'Platoon Leader — leads ~16–40 people.',
  PSG: 'Platoon Sergeant — senior enlisted leader of a platoon.',
  '1SG': 'First Sergeant — senior enlisted leader of a company.',
  CO: 'Commanding Officer / Company — unit leader or a company-sized unit.',
  BN: 'Battalion — a unit of ~300–1,000 people.',
  BDE: 'Brigade — a unit of several thousand people.',
  PLT: 'Platoon — a unit of ~16–40 people.',
  SITREP: 'Situation Report — a status update to leadership.',
  OPORD: 'Operations Order — a detailed plan of action.',
  FRAGO: 'Fragmentary Order — a quick change to an existing plan.',
  SHARP: 'Sexual Harassment/Assault Response & Prevention — a unit program & representative role.',
  EO: 'Equal Opportunity — a unit program & representative role.',
  QRF: 'Quick Reaction Force — an on-call response team.',
  FOB: 'Forward Operating Base — a field site.',
  TOC: 'Tactical Operations Center — the command/coordination hub.',
  POC: 'Point of Contact — the responsible person.',
  ROE: 'Rules of Engagement — the rules governing action.',
  RTO: 'Radio/Telephone Operator — communications.',
  MRE: 'Meal, Ready-to-Eat — field ration.',
  ETS: 'Expiration of Term of Service — end of enlistment.',
  PCC: 'Pre-Combat Checks — readiness inspections.',
  CONOP: 'Concept of Operations — a plan overview.',
}

export interface GlossaryHit {
  term: string
  def: string
}

/** Find known acronyms present in the text, in first-seen order, de-duped. */
export function findAcronyms(text: string): GlossaryHit[] {
  if (!text) return []
  const seen = new Set<string>()
  const hits: GlossaryHit[] = []
  // Match all-caps tokens (2–6 chars), optionally with a leading digit like 1SG.
  const tokens = text.match(/\b[0-9]?[A-Z]{2,6}\b/g) ?? []
  for (const raw of tokens) {
    const key = raw.toUpperCase()
    if (GLOSSARY[key] && !seen.has(key)) {
      seen.add(key)
      hits.push({ term: key, def: GLOSSARY[key] })
    }
  }
  return hits
}
