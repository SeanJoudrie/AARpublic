#!/usr/bin/env python3
"""
Build a region's bird dataset from GBIF occurrence facets.

Produces, for every commonly-reported bird in a region:
  - a reporting index (how often it's reported, relative to the #1 bird)
  - a rarity tier derived from that index
  - an effort-corrected 12-month seasonality curve
  - a residency class (year-round / summer / winter / migrant)

Why GBIF and not the eBird API: GBIF needs no API key and its data is openly
licensed, so this can ship commercially. ~98% of the bird records it returns for
US states come from the eBird Observation Dataset anyway, so we're reading
essentially the same observations through a license we can actually use.

Usage:
    python3 fetch_region.py --gadm USA.22_1 --slug us-ma --name Massachusetts
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

API = "https://api.gbif.org/v1"
AVES = 212

# The eBird Observation Dataset. Restricting to it keeps the denominator
# consistent: one record per species per checklist, from one methodology.
EBIRD_DATASET = "4fa7b334-ce0d-4e88-aaae-2e0c138d049e"

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# North American common names for taxa whose GBIF vernacular is global,
# British, or a lumped slash-form. Kept as data, not code, so a new region can
# extend it without touching the pipeline.
_HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(_HERE, "name_overrides.json")) as _fh:
    NAME_OVERRIDES = {k: v for k, v in json.load(_fh).items()
                      if not k.startswith("_")}

# Words that stay lowercase-internal when we have to re-case a name ourselves.
_KEEP_LOWER = {"of", "the", "and"}

# Birds that unambiguously occur in a region. If one of these doesn't come back
# from GBIF, the dataset has a taxonomy gap rather than a real absence.
EXPECT = {
    "us-ma": {
        "Accipiter cooperii": "Cooper's Hawk",
        "Butorides virescens": "Green Heron",
        "Circus cyaneus": "Northern Harrier",
        "Anser caerulescens": "Snow Goose",
        "Cardinalis cardinalis": "Northern Cardinal",
        "Poecile atricapillus": "Black-capped Chickadee",
        "Sialia sialis": "Eastern Bluebird",
        "Archilochus colubris": "Ruby-throated Hummingbird",
    },
}


def clean_name(vernacular, scientific):
    """Normalise a GBIF vernacular name into a birder-facing common name."""
    if scientific in NAME_OVERRIDES:
        return NAME_OVERRIDES[scientific]
    if not vernacular:
        return scientific

    name = re.sub(r"\s*\([^)]*\)", "", vernacular)   # drop "(canadensis Group)"
    name = name.split(",")[0].strip()                 # drop alternate after comma
    if not name:
        return scientific

    # GBIF is inconsistent about casing; if it looks uncased, title-case it.
    if name.islower() or name[1:].islower():
        parts = []
        for i, w in enumerate(name.split()):
            parts.append(w if (i and w.lower() in _KEEP_LOWER) else w[:1].upper() + w[1:])
        name = " ".join(parts)
    return name


def get(path, **params):
    """GET a GBIF endpoint, with retries on transient failure."""
    url = f"{API}/{path}?{urllib.parse.urlencode(params)}"
    last = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return json.load(r)
        except Exception as exc:  # noqa: BLE001 - network flakiness is expected
            last = exc
            time.sleep(2 ** attempt)
    raise RuntimeError(f"GBIF request failed after retries: {url}") from last


def facet_counts(data, name):
    """
    Pull a facet block out of a GBIF search response as a {name: count} dict.

    GBIF echoes facet fields in SCREAMING_SNAKE ("SPECIES_KEY") while the request
    param is camelCase ("speciesKey"), so compare with separators stripped.
    """
    want = name.replace("_", "").upper()
    for f in data.get("facets", []):
        if f["field"].replace("_", "").upper() == want:
            return {c["name"]: c["count"] for c in f["counts"]}
    return {}


def month_vector(counts):
    """Turn a {month: count} facet into a 12-slot list indexed Jan..Dec."""
    return [counts.get(str(m), 0) for m in range(1, 13)]


# --- rarity tiers -------------------------------------------------------------
#
# `index` is a species' record count as a fraction of the single most-reported
# bird in the region. It is NOT eBird's "% of checklists" frequency -- we can't
# compute that from GBIF because we have no count of distinct checklists. It's a
# relative abundance index, which is all the tiering actually needs.

TIERS = [
    ("common",     0.25),    # you will see this without trying
    ("uncommon",   0.06),    # a good walk in the right habitat
    ("rare",       0.015),   # you go looking for it
    ("super_rare", 0.002),   # a genuinely lucky day, but findable
    ("vagrant",    0.0),     # off-course strays and escaped captives
]

# Below the super_rare floor the tail stops being "rare birds" and becomes
# noise: one-record vagrants (Northern Wheatear, Painted Bunting) and escaped
# captives (Egyptian Goose, Red Junglefowl). Those are real records but they are
# not *findable*, and a tier nobody can complete defeats the point of a set. We
# keep them in the dataset -- finding one should be a delight -- but they never
# get dealt into a deck.
DECK_INELIGIBLE = {"vagrant"}


def tier_for(index):
    for name, floor in TIERS:
        if index >= floor:
            return name
    return "vagrant"


def residency(corrected):
    """
    Classify a seasonality curve, after effort correction, into a residency
    pattern. `corrected` is 12 values normalised so the peak month is 1.0.
    """
    summer = sum(corrected[4:9]) / 5      # May-Sep
    winter = (sum(corrected[0:3]) + sum(corrected[10:12])) / 5   # Nov-Mar
    trough = min(corrected)

    if trough >= 0.35:
        return "year_round"
    if summer > winter * 2.5:
        return "summer"
    if winter > summer * 2.5:
        return "winter"
    return "migrant"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gadm", required=True, help="GADM region id, e.g. USA.22_1")
    ap.add_argument("--slug", required=True, help="output slug, e.g. us-ma")
    ap.add_argument("--name", required=True, help="display name, e.g. Massachusetts")
    ap.add_argument("--years", default="2015,2026", help="GBIF year range filter")
    ap.add_argument("--top", type=int, default=180, help="how many species to keep")
    ap.add_argument("--out", default="../data", help="output directory")
    args = ap.parse_args()

    base = dict(taxonKey=AVES, gadmGid=args.gadm, year=args.years,
                datasetKey=EBIRD_DATASET, limit=0)

    # 1. Region-wide monthly effort baseline. Birders are not uniform across the
    #    year -- in Massachusetts May carries ~4x the records of February -- so
    #    raw monthly counts describe birder behaviour, not bird behaviour.
    print(f"[1/4] effort baseline for {args.name}", file=sys.stderr)
    eff = get("occurrence/search", **base, facet="month", facetLimit=12)
    effort = month_vector(facet_counts(eff, "MONTH"))
    total_records = eff["count"]
    if min(effort) <= 0:
        sys.exit("effort baseline has an empty month; widen --years")

    # 2. Which species are actually reported here.
    print(f"[2/4] species facet (top {args.top})", file=sys.stderr)
    sp = get("occurrence/search", **base, facet="speciesKey", facetLimit=args.top)
    ranked = sorted(facet_counts(sp, "SPECIESKEY").items(),
                    key=lambda kv: -kv[1])
    if not ranked:
        sys.exit("no species returned; check --gadm")
    top_count = ranked[0][1]

    # 3. Resolve names and per-species seasonality, in parallel.
    print(f"[3/4] resolving {len(ranked)} species", file=sys.stderr)

    def build(item):
        key, count = item
        try:
            taxon = get(f"species/{key}")
            if taxon.get("rank") != "SPECIES":
                return None    # drop genus-level and hybrid buckets
            months = get("occurrence/search", **dict(base, taxonKey=key),
                         facet="month", facetLimit=12)
            raw = month_vector(facet_counts(months, "MONTH"))
        except Exception as exc:  # noqa: BLE001
            print(f"  ! skipped {key}: {exc}", file=sys.stderr)
            return None

        # Effort correction: what share of that month's birding turned up this
        # species, rescaled so the best month is 1.0.
        share = [r / e for r, e in zip(raw, effort)]
        peak = max(share)
        if peak <= 0:
            return None
        corrected = [round(s / peak, 3) for s in share]
        index = count / top_count
        tier = tier_for(index)

        return {
            "deckEligible": tier not in DECK_INELIGIBLE,
            "speciesKey": int(key),
            "scientificName": taxon.get("canonicalName"),
            "commonName": clean_name(taxon.get("vernacularName"),
                                     taxon.get("canonicalName")),
            "family": taxon.get("family"),
            "order": taxon.get("order"),
            "records": count,
            "reportingIndex": round(index, 5),
            "tier": tier,
            "seasonality": corrected,
            "peakMonth": MONTHS[corrected.index(1.0)],
            "residency": residency(corrected),
        }

    with ThreadPoolExecutor(max_workers=6) as pool:
        species = [s for s in pool.map(build, ranked) if s]

    # 4. Validate before emitting.
    #
    # GBIF's eBird mirror silently drops taxa whose names moved genus recently:
    # Cooper's Hawk went to *Astur cooperii*, GBIF's backbone marks *Astur* as
    # DOUBTFUL, and the records fail to match -- zero Massachusetts records for
    # a bird that nests in suburban yards. Nothing about the output looks wrong
    # when this happens; the species is simply not there. So we assert that a
    # short list of birds that must exist in the region actually came back, and
    # flag any surviving slash-form name as needing an override.
    warnings = []
    by_sci = {s["scientificName"]: s for s in species}
    for sci, common in EXPECT.get(args.slug, {}).items():
        if sci not in by_sci:
            warnings.append(f"MISSING: {common} ({sci}) -- likely a GBIF "
                            f"taxonomy gap; verify before shipping a deck")

    for s in species:
        if "/" in s["commonName"]:
            warnings.append(f"AMBIGUOUS NAME: {s['commonName']!r} "
                            f"({s['scientificName']}) -- add to name_overrides.json")

    for w in warnings:
        print(f"  ! {w}", file=sys.stderr)

    # 5. Emit.
    out = {
        "region": {"slug": args.slug, "name": args.name, "gadm": args.gadm},
        "source": {
            "provider": "GBIF",
            "dataset": "eBird Observation Dataset (EOD)",
            "datasetKey": EBIRD_DATASET,
            "years": args.years,
            "totalRecords": total_records,
            "retrieved": time.strftime("%Y-%m-%d"),
            "note": ("reportingIndex is a species' record count relative to the "
                     "most-reported bird in the region, not eBird checklist "
                     "frequency. seasonality is effort-corrected against the "
                     "region's own monthly record volume."),
        },
        "effortByMonth": effort,
        "species": species,
    }

    path = f"{args.out}/{args.slug}.json"
    with open(path, "w") as fh:
        json.dump(out, fh, indent=2)
    print(f"[4/4] wrote {path} ({len(species)} species)", file=sys.stderr)


if __name__ == "__main__":
    main()
