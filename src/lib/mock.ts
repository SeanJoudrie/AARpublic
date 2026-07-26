import type { TranslateResult } from './types'

// A realistic canned result so the app is fully explorable with zero setup —
// no API key, no Supabase, no network. `generate.ts` returns this whenever the
// edge-function URL isn't configured. Delete or ignore once the real backend
// is wired up.
export const MOCK_RESULT: TranslateResult = {
  matchScore: 78,
  summary:
    'Operations and logistics leader with 6 years directing teams of 30+ under high-tempo, resource-constrained conditions. Owns end-to-end planning, accountability for seven-figure equipment inventories, and cross-functional coordination — a strong fit for an operations manager role that rewards ownership, process rigor, and calm execution under pressure.',
  bullets: [
    {
      original: 'Served as squad leader (NCO) responsible for 12 soldiers and $2.3M in equipment.',
      translated:
        'Led a 12-person team and maintained 100% accountability for $2.3M in equipment across daily operations and inspections.',
      rationale:
        'Squad leader maps cleanly to front-line team lead; equipment accountability is asset/inventory management.',
      keywords: ['team leadership', 'accountability', 'asset management'],
    },
    {
      original: 'Coordinated BN-level logistics for field exercises across 3 sites.',
      translated:
        'Coordinated multi-site logistics for 300+ personnel across 3 locations, aligning transport, supply, and scheduling with zero critical shortfalls.',
      rationale:
        'Battalion-level logistics coordination is direct operations/supply-chain management experience.',
      keywords: ['logistics', 'cross-functional coordination', 'scheduling'],
    },
    {
      original: 'Trained and evaluated junior personnel on unit SOP; wrote the AAR after each rotation.',
      translated:
        'Onboarded and evaluated 20+ junior team members against documented SOPs, cutting ramp time and standardizing performance.',
      rationale:
        'Training/evaluation against SOPs is onboarding, QA, and people development.',
      keywords: ['training', 'process documentation', 'performance management'],
    },
  ],
  coveredKeywords: [
    'team leadership',
    'logistics',
    'accountability',
    'process documentation',
    'scheduling',
    'cross-functional coordination',
  ],
  missingKeywords: ['P&L ownership', 'ERP software', 'vendor negotiation', 'KPI dashboards'],
  starAnswers: [
    {
      question: 'Tell me about a time you led a team through a high-pressure situation.',
      situation:
        'During a multi-site field exercise, a transport failure threatened to strand supplies for 300+ personnel.',
      task: 'I owned logistics coordination and had to keep every site supplied without slipping the timeline.',
      action:
        'I re-routed assets across the three sites, re-sequenced deliveries by priority, and set a 2-hour check-in cadence with each site lead.',
      result:
        'Every site stayed operational with zero critical shortfalls, and the re-sequencing model became the standard for later exercises.',
    },
    {
      question: 'Describe how you develop people on your team.',
      situation: 'I inherited a group of 20+ junior members with inconsistent performance against our SOPs.',
      task: 'I needed to standardize their performance and shorten how long it took them to become effective.',
      action:
        'I built a structured onboarding path tied to documented SOPs and ran individual evaluations with concrete feedback.',
      result: 'Ramp time dropped noticeably and performance across the group became consistent and measurable.',
    },
  ],
}
