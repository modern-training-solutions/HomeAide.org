# HomeAide.org — business brief

**Audience:** project business manager  
**Status:** publishable static website with the current CMS directory and starter guides  
**Host relationship:** Modern Training Solutions (for-profit) hosts this as a **non-revenue** public resource. Do **not** describe HomeAide as a nonprofit, a charity, a placement agency, or a Medicare contractor.

---

## Why this exists

Families trying to keep someone at home are asked to pick a home health agency under time pressure. Medicare already publishes who is certified, how to call them, and how they score. That file is a 12,000-row spreadsheet with clinical column names.

HomeAide.org turns that file into:

1. **Search** — find an agency by city, ZIP, name, or state; filter on star rating and whether they list home health aide services.
2. **Profiles** — contact information, listed services, CMS quality-of-patient-care star, outcome percentages, and national-rate comparisons.
3. **Guides** — short, Care.com-style articles aimed at the pain points that send people to Google (coverage, ratings, discharge, family burnout).

The mission on the site is genuine: help people find available home health help and understand the choice. The tone should stay calm, useful, and honest. We are not selling leads.

---

## What shipped in this folder

| Path | Role |
| --- | --- |
| `source/index.html` | Homepage: search, mission, guide tiles, live counts |
| `source/search.html` | Full directory search |
| `source/agency.html` | Profile for one CMS Certification Number |
| `source/browse.html` | All states and territories |
| `source/about.html` | Mission and hosting disclaimer |
| `source/data.html` | Methodology and CMS attribution |
| `source/guides/` | 12 starter articles + hub |
| `source/data/HH_Provider_Jul2026.csv` | Source extract from CMS |
| `source/data/catalog.json` | Compact search index (~1.2 MB, loaded in the browser) |
| `source/data/states/*.json` | Full profiles, loaded only when you open an agency |
| `source/data/lookup.json` | All profiles in one file — for **enrichment scripts**, not the public pages |
| `source/data/stats.json` | Headline counts |
| `scripts/rebuild_data.py` | Rebuild JSON after a CMS refresh |
| `source/assets/` | CSS and JavaScript |

**How to publish:** Cloudflare Pages project `homeaide-org`, deployed from `source/` on push to `main`. No build step. Search needs the `data/` files served over HTTP (open via a local or production server, not `file://`).

Preview locally:

```bash
cd source
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.

---

## Data we have right now

- **Dataset:** CMS Provider Data Catalog — *Home Health Care Agencies* (`6jpm-sxkc`)
- **Topic:** [Home health services](https://data.cms.gov/provider-data/topics/home-health-services) (the public-web spelling is *health*, not “heatlth”)
- **Download used:** July 2026 CSV from the dataset landing page
- **Counts in this build:** **12,460** agencies · **55** states/territories · **9,122** list home health aide services · average star **3.25** among agencies that have a rating
- **Source metadata:** last modified 2026-05-27 · released 2026-07-15 · planned CMS update **2026-10-21**

Each public profile includes name, CCN, address, phone, ownership, certification date, six service flags, star rating, timely start of care, walking/bed/bathing/breathing/medication improvement rates, discharge-to-community / readmission / hospitalization categories, and Medicare spending vs national average.

We did **not** ingest the companion CMS files yet (HHCAHPS patient survey, zip-code service areas, state and national averages). Those are listed under enrichment.

---

## Business goals

1. **Be the understandable front door** to Medicare-certified home health agencies — especially agencies that offer home health aide services.
2. **Earn search traffic** with guides that match real family questions, then send readers into the directory.
3. **Become a trusted data layer** over time by enriching CMS rows (website, languages, hours, “accepting patients”) so HomeAide is more useful than the raw spreadsheet.
4. **Stay non-revenue.** No ads, no sponsored listings, no lead fees. That is a product constraint, not a slogan.
5. **Protect the brand of Modern Training Solutions** by being explicit: related/hosted by MTS, not a nonprofit, not medical advice, not a guarantee of availability.

Success looks like: a family can type a ZIP, see three callable agencies with stars and aide flags, and understand whether Medicare is even the right payer — in one visit.

---

## Article writing tasks (content program)

The 12 guides in `guides/` are **layout-complete starter pieces** modeled on Care.com’s resource style:

- Promise in the H1
- One-line dek
- Byline, date, read time
- **Key takeaways** box before the body
- Short H2 sections with practical steps
- Related guides
- A search call-to-action

They are not finished journalism. Do not ship them as “expert-reviewed” until a clinician or experienced discharge planner has read them.

### Priority articles to deepen (same URLs)

| URL slug | Pain point | Why it ranks / converts |
| --- | --- | --- |
| `does-medicare-pay-for-home-health-aides` | Coverage myth | Highest-intent payer question |
| `home-health-vs-home-care` | Wrong marketplace | Stops wasted weeks |
| `after-hospital-how-to-start-home-health` | Discharge chaos | Time-critical |
| `how-to-read-medicare-star-ratings` | Trust in our data | Makes the directory usable |
| `questions-to-ask-a-home-health-agency` | First call | Pairs with search |
| `when-family-caregiving-is-not-enough` | Burnout | Emotional on-ramp |
| `dementia-and-home-health` | Condition + setting | High search volume |
| `finding-aide-services-on-medicare-compare` | Our differentiator | Aide flag |

### New titles worth adding later

- How to check if an agency serves your ZIP (needs zip-code file enrichment)
- What “timely initiation of care” means when mom is still in the hospital
- Paying when Medicare says no: Medicaid waivers, VA, LTC insurance
- How to replace an agency that is not showing up
- Spanish-language companion versions of the top four guides

### Editorial rules

- No invented statistics. Link CMS, Medicare.gov, or named studies.
- No “we are a nonprofit.”
- No ranking agencies as “best” unless the copy says “highest CMS star in this file, which is not the same as best for you.”
- Every guide should end with a path into search.
- Keep the Care.com skim pattern: takeaways first, short sections, related reading.

---

## Enrichment tasks (not done — future work)

CMS gives identity, services, and quality. It does **not** give the human profile people expect (photo, about text, languages, website, “accepting patients”). Enrichment is how HomeAide becomes a data source instead of a nicer spreadsheet.

Do this in order. Do not scrape behind logins or buy consumer PII.

### Phase A — more CMS files (public, low risk)

1. **Home Health Care – Zip Codes** file: map each CCN to ZIPs served so search can be “agencies that cover 19147,” not “agencies with an office in 19147.”
2. **HHCAHPS** patient survey: add “would recommend” and communication scores on the profile.
3. **State and national averages:** show a sparkline vs state, not only vs national categories.
4. **Quarterly refresh:** on/after 2026-10-21 download the new CSV from the dataset page, replace `data/HH_Provider_Jul2026.csv`, run `python3 scripts/rebuild_data.py`, spot-check CA/TX/FL counts, republish.

### Phase B — public-web entity resolution (the “create profiles” work)

For each CCN, a researcher or script:

1. Search `"[Provider Name]" "[City]" home health`.
2. Capture official website, Google Business profile URL, and public phone if it differs.
3. Note languages, office hours, and “Medicare accepted” if stated on the agency’s own site.
4. Store in a new file `data/enrichment/{ccn}.json` so a rebuild can merge without editing CMS fields.
5. Flag mismatches (phone in CMS ≠ phone on website) for a human.

Suggested enrichment schema:

```json
{
  "ccn": "027001",
  "website": null,
  "languages": [],
  "hours": null,
  "acceptingPatients": null,
  "notes": "",
  "sources": [],
  "updated": "YYYY-MM-DD",
  "status": "pending"
}
```

Start with one state (pilot: a mid-size state, not CA) and measure hours per 100 agencies before scaling.

### Phase C — usefulness people will feel

- “Accepting patients this month” — only if the agency states it or a partner feed exists; never guess.
- Languages and weekend intake.
- Cross-link related MTS education only in an “About the host” footnote, never as a sales overlay on results.

### Out of scope unless legal/comms says otherwise

- Paid placement
- Collecting patient reviews ourselves (moderation and liability)
- Claiming we “approve” providers — CMS certification is the approval we show

---

## Positioning language (approved)

**Use:** “HomeAide.org is a free public resource, hosted by Modern Training Solutions, that helps families find Medicare-certified home health agencies.”

**Use:** “Listings come from CMS. Always call the agency to confirm they can start care.”

**Do not use:** nonprofit, 501(c)(3), charity, “we certify aides,” “we will match you with a caregiver,” “best agencies in America.”

---

## Operating cadence

| When | Who | What |
| --- | --- | --- |
| CMS planned update (next: 2026-10-21) | Ops / intern | Refresh CSV + rebuild JSON |
| Monthly | Editor | Deepen one starter guide or add one new guide |
| After pilot enrichment | Manager | Decide whether to fund Phase B statewide |
| Any public complaint about a listing | Manager | Check CMS source row; we do not “fix” CMS numbers |

---

## Technical notes for whoever publishes

- Static HTML/CSS/JS. No framework, no account system, no analytics baked in (add GA4 later if MTS wants it, using the usual Ultron GA skill — not before a privacy line on the site).
- `catalog.json` is loaded for search. Keep it under ~2 MB if possible.
- Agency pages fetch only `data/states/{ST}.json`.
- `lookup.json` is large; do not link it from the public UI.
- Rebuild: `python3 scripts/rebuild_data.py --csv data/HH_Provider_Jul2026.csv`
