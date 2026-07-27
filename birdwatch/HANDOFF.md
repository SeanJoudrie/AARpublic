# Birdwatch — project handoff

Everything decided and built so far, in one file. Written to be portable: this
plus the seven files listed below is the whole project.

---

## 1. The idea

A birdwatching **scrapbook**, not a game. You pick your region, you get a finite
set of local birds tiered by rarity, and you go photograph them. Take a photo of
a chickadee, it goes under Chickadee. You learn what lives near you and when it
shows up.

Explicitly **not**: competitive, social, leaderboarded, or AI-powered. No species
recognition — you tell the app what you found. It's your scrapbook; there's
nobody to cheat.

The core feeling is `11 / 12 rare birds`.

### Why a closed set is the whole product

Every existing app gives you an *unbounded* list. A life list has no ending, so
it has no completion. A 24-card regional deck does. That's the entire design
thesis, and most decisions below follow from it — including throwing away real
data that would make a tier uncompletable.

## 2. Does it already exist — no, not this

| App | What it is | Why it isn't this |
|---|---|---|
| **Birdex** | Pokémon-style bird cards, points, rarity, leaderboards | **UK only** (US on long-term roadmap), and competitive/points-driven |
| **Merlin** (Cornell) | AI photo + sound ID, life list | An *identification* tool. Infinite list, no set to complete |
| **eBird** (Cornell) | Checklist logging | Scientific data entry, and it publishes your sightings |
| **iNaturalist / Seek** | All taxa, global, community ID | Infinite, ID-focused, global rather than regional |

The unoccupied position: **closed, regional, tiered, seasonal, private.**
Closest thing in spirit is a National Parks passport stamp book.

## 3. Data source, and why

**GBIF**, filtered to the eBird Observation Dataset
(`datasetKey=4fa7b334-ce0d-4e88-aaae-2e0c138d049e`).

GBIF needs no API key and is openly licensed, so it can ship commercially — the
eBird API proper does not cleanly allow that. Roughly 98% of the bird records
GBIF returns for a US state come from eBird anyway, so you read essentially the
same observations through a licence that works.

Regions are GADM ids: Massachusetts is `USA.22_1`. Counties exist too
(`USA.22.X_1`) — a drop-in change when state granularity stops being enough.

**Massachusetts: 29.3M records, 2015–2026, 420 species.**

## 4. The two derived numbers

### `reportingIndex` — how often a bird is actually reported

Record count as a fraction of the most-reported bird in the region. Blue Jay =
1.000, Black-capped Chickadee = 0.985.

Call it a **relative index, never "% of checklists."** GBIF gives no count of
distinct checklists, so there's no denominator for a true percentage. eBird's
real frequency stat is a different thing and claiming parity would be wrong.

### `seasonality` — when it's here, corrected for birder effort

**This is the step that makes or breaks the dataset.** Massachusetts birding runs
**20.7% of the year's records in May and 5.2% in February** — a 4× effort swing.
On raw counts, nearly every species looks like a spring migrant, because that's
when *people* are outside.

Fix: divide each species' monthly counts by the region's own monthly record
volume, rescale so its best month is 1.0. What survives is real seasonality.
Then classify as `year_round` / `summer` / `winter` / `migrant`.

Post-correction sanity checks that came out right: Harlequin Duck and Snow
Bunting → winter. Gray Catbird → summer, peaking June. Chickadee and titmouse →
year-round, peaking February (leaves down, feeders busy).

## 5. Rarity tiers

| Tier | `reportingIndex` | Meaning | n |
|---|---|---|---|
| `common` | ≥ 0.25 | you'll see it without trying | 32 |
| `uncommon` | 0.06 – 0.25 | a good walk in the right habitat | 68 |
| `rare` | 0.015 – 0.06 | you go looking for it | 81 |
| `super_rare` | 0.002 – 0.015 | a genuinely lucky day, but findable | 87 |
| `vagrant` | < 0.002 | strays and escaped captives | 152 |

**The vagrant floor is a design decision, not a statistical one.** Below ~0.002
the tail stops being rare birds and becomes noise: one-record vagrants (Northern
Wheatear, Painted Bunting) and escaped captives (Egyptian Goose, Red Junglefowl,
Swan Goose). Real records, but not *findable* — and a tier nobody can complete
defeats the point of a set. They stay in the dataset, since finding one should be
a delight, but `deckEligible: false` keeps them out of decks.

268 of 420 species are deck-eligible.

## 6. Decks

Which birds belong in a "backyard" set is **editorial** — a judgement about
habitat and recognisability no dataset makes for you. So `decks/*.json` is a
hand-written list of scientific names and `build_deck.py` attaches the numbers.

**Deck tiers rank within the deck, not by regional tier.** A Baltimore Oriole is
only `uncommon` against all 420 Massachusetts birds, but inside a 24-card
backyard set it's one of the hardest cards — and that's the number the player
should see. Ranking within the deck also guarantees a real difficulty curve
instead of 22 easy cards and two impossible ones. Both live on the card as
`tier` and `regionalTier`.

### Massachusetts Backyard 24 — shape 8 / 8 / 6 / 2

- **common** — Blue Jay, Black-capped Chickadee, American Robin, Northern
  Cardinal, Song Sparrow, Mourning Dove, American Goldfinch, Tufted Titmouse
- **uncommon** — Downy Woodpecker, White-breasted Nuthatch, Red-bellied
  Woodpecker, Gray Catbird, Carolina Wren, House Finch, Northern Flicker,
  Dark-eyed Junco
- **rare** — White-throated Sparrow, Northern Mockingbird, Baltimore Oriole,
  Eastern Bluebird, Cedar Waxwing, Ruby-throated Hummingbird
- **super rare** — Rose-breasted Grosbeak, Scarlet Tanager

The eight easiest are year-round residents gettable in January. The middle adds a
winter visitor so the set teaches that some birds only exist here in the cold.
The hard end is spring-and-summer only.

That's deliberate: **a January player physically cannot finish the deck** and has
a reason to still be playing in May. The seasonal lock is the retention mechanic,
and it cost nothing to build because the data already knew.

## 7. Known data problems

**Cooper's Hawk is missing from GBIF.** eBird moved it to genus *Astur*; GBIF's
backbone marks *Astur* as DOUBTFUL, so the records fail to match and drop out.
Zero Massachusetts records for a hawk that nests in suburban yards, while
Sharp-shinned Hawk has 31,817. Left out of the deck rather than faked. American
Goshawk is hit by the same move (166 records, deep in vagrant territory).

Nothing about the output *looks* wrong when this happens — the species is simply
absent. So `fetch_region.py` asserts a short list of birds that certainly occur
in the region actually came back, and warns if not. **Extend `EXPECT` for every
new region.**

**GBIF vernacular names are global, not North American.** Mostly fine — of 38
spot-checked common Massachusetts species only *Circus cyaneus* was wrong ("Hen
Harrier"). The rest are lumped slash-forms, and they can't be auto-resolved:
"Great Blue/Cocoi Heron" needs the trailing noun while "Great Cormorant/European
Shag" must keep its own — same shape, opposite rule. All 11 are written out in
`name_overrides.json`; the pipeline warns on any surviving slash-form.

**Effort correction is not habitat correction.** Seasonality says *when*, not
*where*. A saltmarsh sparrow and a feeder bird with identical curves are not
equally findable from your yard. Deck curation is currently the only thing
encoding habitat — worth making explicit data eventually.

**State granularity is coarse.** The Berkshires and Cape Cod share a state and
almost nothing else.

## 8. What's built

```
pipeline/fetch_region.py           GBIF -> region species, tiers, seasonality
pipeline/build_deck.py             curated list -> playable deck
pipeline/name_overrides.json       11 North American name fixes
decks/backyard-24.json             the curated starter set (editorial)
data/us-ma.json                    420 MA birds            (generated, 232K)
data/deck-us-ma-backyard-24.json   the built deck          (generated, 20K)
README.md                          methodology detail
```

Python 3 standard library only. No API key, no dependencies. Full rebuild ≈ 80s:

```bash
cd pipeline
python3 fetch_region.py --gadm USA.22_1 --slug us-ma --name Massachusetts --top 420
python3 build_deck.py --region us-ma --deck backyard-24
```

## 9. Not built yet

- **App code.** None exists. v1 needs no backend at all — bundle the deck JSON,
  keep photos and progress on-device. Local-first is also the privacy story, and
  the thing eBird can't offer.
- **Photos and audio.** Wikimedia Commons / iNaturalist CC photos, xeno-canto for
  song. Licensing and attribution need resolving before anything ships. Macaulay
  Library is *not* freely licensable.
- **More decks** off the same data: Coastal, Warbler Wave, Winter Visitors.
- **More regions.** The pipeline is already region-agnostic — only `EXPECT` and
  any new name overrides are per-region.
- **Other taxa.** Salamanders were the original stretch idea. The schema carries
  over but the data doesn't: eBird has nothing for herps, so you'd fall back to
  sparser GBIF/iNaturalist data. And build in location obscuring for sensitive
  herps from day one — collection pressure from published locations is a real,
  documented problem, which is why iNaturalist auto-obscures them.

## 10. Open questions

1. **Who curates each region's decks?** Data can rank species; picking a
   *charming* set is editorial work per region. That's also the moat.
2. **Photo licensing** for reference images on each card.
3. **County or state granularity** for v1.
4. **Does habitat need to be real data** rather than living implicitly in deck
   curation — required before decks can be generated rather than hand-picked.
