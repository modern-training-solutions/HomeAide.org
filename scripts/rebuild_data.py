#!/usr/bin/env python3
"""Rebuild data/*.json from the CMS Home Health Care Agencies CSV."""
import csv, json, collections, argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def yn(v):
    return (v or "").strip().lower() == "yes"


def num(v):
    v = (v or "").strip()
    if v in ("", "-", "Not Available", "N/A"):
        return None
    try:
        return float(v)
    except ValueError:
        return None


def phone(v):
    d = "".join(c for c in (v or "") if c.isdigit())
    if len(d) == 10:
        return f"({d[:3]}) {d[3:6]}-{d[6:]}"
    return v or ""


def slug(name, ccn):
    s = "".join(c.lower() if c.isalnum() else "-" for c in name)
    while "--" in s:
        s = s.replace("--", "-")
    return f"{s.strip('-')}-{ccn.lower()}"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--csv", default=str(DATA / "HH_Provider_Jul2026.csv"))
    args = p.parse_args()
    src = Path(args.csv)
    states_dir = DATA / "states"
    states_dir.mkdir(parents=True, exist_ok=True)

    with open(src, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    providers = []
    by_state = collections.defaultdict(list)
    stars = []
    hha_yes = 0
    for x in rows:
        rec = {
            "ccn": x["CMS Certification Number (CCN)"].strip(),
            "name": x["Provider Name"].strip(),
            "addr": x["Address"].strip(),
            "city": x["City/Town"].strip(),
            "zip": x["ZIP Code"].strip(),
            "st": x["State"].strip(),
            "phone": phone(x["Telephone Number"]),
            "own": x["Type of Ownership"].strip(),
            "svc": {
                "nursing": yn(x["Offers Nursing Care Services"]),
                "pt": yn(x["Offers Physical Therapy Services"]),
                "ot": yn(x["Offers Occupational Therapy Services"]),
                "speech": yn(x["Offers Speech Pathology Services"]),
                "msw": yn(x["Offers Medical Social Services"]),
                "hha": yn(x["Offers Home Health Aide Services"]),
            },
            "cert": x["Certification Date"].strip(),
            "star": num(x["Quality of patient care star rating"]),
            "timely": num(x["How often the home health team began their patients' care in a timely manner"]),
            "walk": num(x["How often patients got better at walking or moving around"]),
            "bed": num(x["How often patients got better at getting in and out of bed"]),
            "bath": num(x["How often patients got better at bathing"]),
            "breath": num(x["How often patients' breathing improved"]),
            "meds": num(x["How often patients got better at taking their drugs correctly by mouth"]),
            "dtc": x["DTC Performance Categorization"].strip() or None,
            "ppr": x["PPR Performance Categorization"].strip() or None,
            "pph": x["PPH Performance Categorization"].strip() or None,
            "spend": num(x["How much Medicare spends on an episode of care at this agency, compared to Medicare spending across all agencies nationally"]),
            "episodes": num(x["No. of episodes to calc how much Medicare spends per episode of care at agency, compared to spending at all agencies (national)"]),
        }
        rec["slug"] = slug(rec["name"], rec["ccn"])
        providers.append(rec)
        by_state[rec["st"]].append(rec)
        if rec["star"] is not None:
            stars.append(rec["star"])
        if rec["svc"]["hha"]:
            hha_yes += 1

    catalog = []
    lookup = {}
    for p in providers:
        catalog.append([
            p["ccn"], p["name"], p["city"], p["st"], p["zip"], p["phone"],
            p["star"], int(p["svc"]["hha"]), int(p["svc"]["nursing"]), int(p["svc"]["pt"]),
        ])
        lookup[p["ccn"]] = p

    state_meta = []
    for st, items in sorted(by_state.items()):
        rated = [i["star"] for i in items if i["star"] is not None]
        state_meta.append({
            "st": st,
            "count": len(items),
            "avgStar": round(sum(rated) / len(rated), 2) if rated else None,
            "hha": sum(1 for i in items if i["svc"]["hha"]),
        })
        (states_dir / f"{st}.json").write_text(json.dumps(items, separators=(",", ":")), encoding="utf-8")

    (DATA / "catalog.json").write_text(json.dumps({
        "source": "CMS Home Health Care Agencies (dataset 6jpm-sxkc)",
        "count": len(providers),
        "fields": ["ccn", "name", "city", "st", "zip", "phone", "star", "hha", "nursing", "pt"],
        "rows": catalog,
    }, separators=(",", ":")), encoding="utf-8")
    (DATA / "lookup.json").write_text(json.dumps(lookup, separators=(",", ":")), encoding="utf-8")
    (DATA / "states.json").write_text(json.dumps(state_meta, separators=(",", ":")), encoding="utf-8")
    (DATA / "stats.json").write_text(json.dumps({
        "agencies": len(providers),
        "states": len(by_state),
        "withStar": len(stars),
        "avgStar": round(sum(stars) / len(stars), 2) if stars else None,
        "offersHha": hha_yes,
        "sourceUrl": "https://data.cms.gov/provider-data/dataset/6jpm-sxkc",
        "sourceName": "CMS Provider Data Catalog — Home Health Care Agencies",
        "release": "July 2026",
        "nextUpdate": "2026-10-21",
    }, indent=2), encoding="utf-8")
    print(f"Wrote {len(providers)} agencies across {len(by_state)} states")


if __name__ == "__main__":
    main()
