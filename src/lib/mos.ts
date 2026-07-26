import type { MosProfile } from './types'

// A small, deliberately conservative seed of military job codes.
//
// Two rules govern this file:
//
// 1. Only codes we're confident about go in. A wrong identification is worse
//    than no identification — telling someone their job was something it
//    wasn't is the fastest way to lose them. Anything not here falls through
//    to the model (or to the user typing their own title), and either way the
//    UI asks them to confirm before it proceeds.
//
// 2. The duty lines describe what someone in this role COMMONLY did. They are
//    never claims about the person using the app. The UI presents them as
//    "tick what you actually did", and numbers are only ever supplied by the
//    user — the app must not invent a headcount or a dollar figure.

/** Duty sets shared by role archetypes, used when we know the role but not the exact code. */
const ARCHETYPES: Record<string, string[]> = {
  leadership: [
    'Led a small team day to day, including their training and readiness',
    'Was accountable for equipment or property assigned to your team',
    'Wrote or briefed plans and passed them down to your people',
    'Trained and mentored junior people, including new arrivals',
    'Kept records and reported status up the chain',
  ],
  logistics: [
    'Tracked, issued, and accounted for supplies or equipment',
    'Ran inventories and reconciled what was on hand against the records',
    'Coordinated transport or movement of people and materiel',
    'Worked with vendors, depots, or supply channels to source parts',
    'Kept the records that had to survive an audit or inspection',
  ],
  maintenance: [
    'Diagnosed and repaired equipment to get it back in service',
    'Ran scheduled services and preventive maintenance on assigned equipment',
    'Kept maintenance records and documented every fault and fix',
    'Ordered parts and tracked jobs from open to closed',
    'Trained others on how to operate or service the equipment',
  ],
  medical: [
    'Provided care to patients under pressure and in the field',
    'Ran sick call, screenings, or routine treatment',
    'Maintained medical supplies and kept controlled items accounted for',
    'Trained others in first aid or life-saving steps',
    'Documented patient care and kept records accurate',
  ],
  comms: [
    'Set up, operated, and maintained communications or network equipment',
    'Troubleshot outages and restored service under time pressure',
    'Managed accounts, access, or user support for a unit',
    'Kept systems patched, secured, and documented',
    'Trained users on the systems you supported',
  ],
  security: [
    'Controlled access, patrolled, and responded to incidents',
    'Wrote reports and statements that had to hold up to review',
    'Enforced standards and procedures consistently, including under pressure',
    'Handled sensitive or controlled items and kept them accounted for',
    'Briefed and trained others on security procedures',
  ],
  operations: [
    'Planned and coordinated day-to-day operations across teams',
    'Tracked and reported status for a unit or section',
    'Briefed leadership and produced the products decisions were made from',
    'Coordinated with other sections or outside units to get things done',
    'Maintained the systems, boards, or records operations depended on',
  ],
}

interface SeedEntry {
  title: string
  branch: string
  archetype: keyof typeof ARCHETYPES
  /** Duties specific to this role, shown before the archetype ones. */
  specific?: string[]
}

/** Codes we're confident about. Normalized keys: uppercase, no spaces or dashes. */
const SEED: Record<string, SeedEntry> = {
  // ── Army ────────────────────────────────────────────────────────────────
  '11B': {
    title: 'Infantryman',
    branch: 'Army',
    archetype: 'leadership',
    specific: [
      'Led or served on a team in field and tactical operations',
      'Maintained weapons and assigned equipment to standard',
      'Planned and rehearsed missions, then executed them as briefed',
    ],
  },
  '11C': { title: 'Indirect Fire Infantryman', branch: 'Army', archetype: 'leadership' },
  '12B': {
    title: 'Combat Engineer',
    branch: 'Army',
    archetype: 'maintenance',
    specific: ['Built, repaired, or cleared obstacles and routes', 'Operated heavy equipment and power tools safely on site'],
  },
  '13B': { title: 'Cannon Crewmember', branch: 'Army', archetype: 'maintenance' },
  '19D': { title: 'Cavalry Scout', branch: 'Army', archetype: 'operations' },
  '19K': { title: 'M1 Armor Crewman', branch: 'Army', archetype: 'maintenance' },
  '25B': {
    title: 'Information Technology Specialist',
    branch: 'Army',
    archetype: 'comms',
    specific: ['Maintained networks, servers, or end-user devices for a unit'],
  },
  '31B': { title: 'Military Police', branch: 'Army', archetype: 'security' },
  '35F': {
    title: 'Intelligence Analyst',
    branch: 'Army',
    archetype: 'operations',
    specific: ['Collected and analyzed information, then turned it into products leaders acted on'],
  },
  '42A': {
    title: 'Human Resources Specialist',
    branch: 'Army',
    archetype: 'operations',
    specific: ['Processed personnel actions and kept records accurate for a unit', 'Was the person people came to with pay, leave, and records problems'],
  },
  '68W': { title: 'Combat Medic Specialist', branch: 'Army', archetype: 'medical' },
  '88M': {
    title: 'Motor Transport Operator',
    branch: 'Army',
    archetype: 'logistics',
    specific: ['Operated and did operator-level maintenance on heavy vehicles', 'Planned routes and moved loads safely on schedule'],
  },
  '91B': { title: 'Wheeled Vehicle Mechanic', branch: 'Army', archetype: 'maintenance' },
  '92A': { title: 'Automated Logistical Specialist', branch: 'Army', archetype: 'logistics' },
  '92Y': { title: 'Unit Supply Specialist', branch: 'Army', archetype: 'logistics' },

  // ── Marine Corps ────────────────────────────────────────────────────────
  '0311': { title: 'Rifleman', branch: 'Marine Corps', archetype: 'leadership' },
  '0331': { title: 'Machine Gunner', branch: 'Marine Corps', archetype: 'leadership' },
  '0341': { title: 'Mortarman', branch: 'Marine Corps', archetype: 'leadership' },

  // ── Navy (ratings) ──────────────────────────────────────────────────────
  HM: { title: 'Hospital Corpsman', branch: 'Navy', archetype: 'medical' },
  MA: { title: 'Master-at-Arms', branch: 'Navy', archetype: 'security' },
  BM: { title: "Boatswain's Mate", branch: 'Navy', archetype: 'operations' },
  IT: { title: 'Information Systems Technician', branch: 'Navy', archetype: 'comms' },
  LS: { title: 'Logistics Specialist', branch: 'Navy', archetype: 'logistics' },
  MM: { title: "Machinist's Mate", branch: 'Navy', archetype: 'maintenance' },
  EM: { title: "Electrician's Mate", branch: 'Navy', archetype: 'maintenance' },

  // ── Air Force ───────────────────────────────────────────────────────────
  '3P0X1': { title: 'Security Forces', branch: 'Air Force', archetype: 'security' },
  '4N0X1': { title: 'Aerospace Medical Service', branch: 'Air Force', archetype: 'medical' },
  '2T2X1': { title: 'Air Transportation', branch: 'Air Force', archetype: 'logistics' },
}

/** Free-text hints → archetype, for when someone describes the job instead of coding it. */
const KEYWORD_ARCHETYPES: [RegExp, keyof typeof ARCHETYPES, string][] = [
  [/\b(medic|corpsman|nurse|medical|health)\b/i, 'medical', 'Medical'],
  [/\b(supply|logistic|warehouse|inventory|transport|driver|fuel)\b/i, 'logistics', 'Logistics'],
  [/\b(mechanic|maintenance|repair|technician|electrician|machinist)\b/i, 'maintenance', 'Maintenance'],
  [/\b(signal|communication|network|cyber|it|radio|computer)\b/i, 'comms', 'Communications / IT'],
  [/\b(police|security|guard|master.?at.?arms|corrections)\b/i, 'security', 'Security'],
  [/\b(intel|analyst|operations|planner|watch|admin|human resources|personnel)\b/i, 'operations', 'Operations'],
  [/\b(squad|team|platoon|section|leader|sergeant|nco|supervisor)\b/i, 'leadership', 'Leadership'],
]

/** Strip the noise out of "I was a 11 bravo" / "MOS: 11B" / "11-B". */
export function normalizeCode(input: string): string {
  const phonetic: Record<string, string> = {
    alpha: 'A', bravo: 'B', charlie: 'C', delta: 'D', echo: 'E', foxtrot: 'F',
    golf: 'G', hotel: 'H', india: 'I', juliet: 'J', kilo: 'K', lima: 'L',
    mike: 'M', november: 'N', oscar: 'O', papa: 'P', quebec: 'Q', romeo: 'R',
    sierra: 'S', tango: 'T', uniform: 'U', victor: 'V', whiskey: 'W',
    xray: 'X', yankee: 'Y', zulu: 'Z',
  }
  let s = input.toLowerCase()
  for (const [word, letter] of Object.entries(phonetic)) {
    s = s.replace(new RegExp(`(\\d)\\s*${word}\\b`, 'g'), `$1${letter.toLowerCase()}`)
  }
  const m = s.match(/\b(\d{2,4}[a-z]\d?[a-z]?|\d[a-z]\d[a-z]\d|[a-z]{2})\b/)
  return (m ? m[1] : s).replace(/[\s-]/g, '').toUpperCase()
}

/**
 * Look a role up locally. Returns `null` when we don't recognize it — the
 * caller then asks the model, or asks the user to describe the job themselves.
 * Never guesses a title from a code it doesn't know.
 */
export function lookupMos(input: string): MosProfile | null {
  const code = normalizeCode(input)
  const seed = SEED[code]
  if (seed) {
    return {
      code,
      title: seed.title,
      branch: seed.branch,
      confidence: 'high',
      duties: [...(seed.specific ?? []), ...ARCHETYPES[seed.archetype]],
    }
  }

  // No code match — see if the words describe a recognizable kind of work.
  for (const [re, archetype, label] of KEYWORD_ARCHETYPES) {
    if (re.test(input)) {
      return {
        code: input.trim(),
        title: label,
        branch: '',
        confidence: 'low',
        duties: ARCHETYPES[archetype],
      }
    }
  }
  return null
}

/** Generic duties for a role we can't place at all — still useful to tick through. */
export function fallbackDuties(): string[] {
  return [...ARCHETYPES.leadership, ...ARCHETYPES.operations].slice(0, 8)
}
