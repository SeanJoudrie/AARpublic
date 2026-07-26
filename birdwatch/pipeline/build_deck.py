#!/usr/bin/env python3
"""
Turn a curated species list into a playable deck.

Curation is editorial -- which birds belong in a "backyard" set is a judgement
call about habitat and recognisability that no dataset makes for you. But the
*difficulty* of each card is not editorial: it comes from the region data.

Deck tiers are assigned by rank within the deck, not by the species' regional
tier. A Baltimore Oriole is merely "uncommon" against all 420 Massachusetts
birds, but inside a 24-card backyard set it is one of the hardest cards, and
that is the number the player should see. Ranking within the deck also
guarantees every deck has a real difficulty curve instead of, say, 22 commons
and two impossible ones.

Usage:
    python3 build_deck.py --region us-ma --deck backyard-24
"""

import argparse
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))

# Cards per tier, easiest first. Sums to the deck size.
TIER_SHAPE = [("common", 8), ("uncommon", 8), ("rare", 6), ("super_rare", 2)]

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

RESIDENCY_BLURB = {
    "year_round": "Here all year — findable in any month.",
    "summer": "A summer breeder. Arrives in spring, gone by late fall.",
    "winter": "A winter visitor. Shows up when the cold does, leaves in spring.",
    "migrant": "Passes through on migration — narrow windows, worth the timing.",
}


def best_months(seasonality, threshold=0.6):
    """Months where the effort-corrected curve is within `threshold` of peak."""
    return [MONTHS[i] for i, v in enumerate(seasonality) if v >= threshold]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--region", required=True, help="region slug, e.g. us-ma")
    ap.add_argument("--deck", required=True, help="deck slug, e.g. backyard-24")
    ap.add_argument("--data", default=os.path.join(_HERE, "..", "data"))
    ap.add_argument("--decks", default=os.path.join(_HERE, "..", "decks"))
    args = ap.parse_args()

    with open(os.path.join(args.data, f"{args.region}.json")) as fh:
        region = json.load(fh)
    with open(os.path.join(args.decks, f"{args.deck}.json")) as fh:
        recipe = json.load(fh)

    by_sci = {s["scientificName"]: s for s in region["species"]}

    # Resolve the curated list. Fail loudly on anything missing -- a silently
    # dropped card would quietly shrink the deck and shift every tier boundary.
    picked, missing = [], []
    for sci in recipe["species"]:
        if sci in by_sci:
            picked.append(by_sci[sci])
        else:
            missing.append(sci)
    if missing:
        sys.exit("not in region data (check spelling or GBIF taxonomy):\n  "
                 + "\n  ".join(missing))

    expected = sum(n for _, n in TIER_SHAPE)
    if len(picked) != expected:
        sys.exit(f"deck has {len(picked)} species, tier shape expects {expected}")

    ineligible = [s["commonName"] for s in picked if not s["deckEligible"]]
    if ineligible:
        sys.exit(f"vagrants can't be dealt into a deck: {', '.join(ineligible)}")

    # Rank by how often the bird is actually reported, hardest last.
    picked.sort(key=lambda s: -s["reportingIndex"])

    cards, i = [], 0
    for tier, n in TIER_SHAPE:
        for s in picked[i:i + n]:
            cards.append({
                "speciesKey": s["speciesKey"],
                "commonName": s["commonName"],
                "scientificName": s["scientificName"],
                "family": s["family"],
                "tier": tier,                        # difficulty within this deck
                "regionalTier": s["tier"],           # difficulty across the region
                "reportingIndex": s["reportingIndex"],
                "residency": s["residency"],
                "seasonality": s["seasonality"],
                "bestMonths": best_months(s["seasonality"]),
                "peakMonth": s["peakMonth"],
                "hint": RESIDENCY_BLURB[s["residency"]],
            })
        i += n

    out = {
        "deck": {
            "slug": recipe["slug"],
            "name": recipe["name"],
            "blurb": recipe["blurb"],
            "region": region["region"],
            "size": len(cards),
        },
        "tierCounts": {t: n for t, n in TIER_SHAPE},
        "source": region["source"],
        "cards": cards,
    }

    path = os.path.join(args.data, f"deck-{args.region}-{recipe['slug']}.json")
    with open(path, "w") as fh:
        json.dump(out, fh, indent=2)
    print(f"wrote {path} ({len(cards)} cards)", file=sys.stderr)

    for c in cards:
        print(f"  {c['tier']:11} {c['commonName'][:26]:28} "
              f"{c['reportingIndex']:6.3f}  {c['residency']:10} "
              f"{'/'.join(c['bestMonths'][:4])}")


if __name__ == "__main__":
    main()
