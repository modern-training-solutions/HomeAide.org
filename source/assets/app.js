const STATE_NAMES = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",
  CT:"Connecticut",DC:"District of Columbia",DE:"Delaware",FL:"Florida",GA:"Georgia",
  HI:"Hawaii",IA:"Iowa",ID:"Idaho",IL:"Illinois",IN:"Indiana",KS:"Kansas",KY:"Kentucky",
  LA:"Louisiana",MA:"Massachusetts",MD:"Maryland",ME:"Maine",MI:"Michigan",MN:"Minnesota",
  MO:"Missouri",MS:"Mississippi",MT:"Montana",NC:"North Carolina",ND:"North Dakota",
  NE:"Nebraska",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NV:"Nevada",
  NY:"New York",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",PR:"Puerto Rico",
  RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",
  UT:"Utah",VA:"Virginia",VI:"U.S. Virgin Islands",VT:"Vermont",WA:"Washington",
  WI:"Wisconsin",WV:"West Virginia",WY:"Wyoming",GU:"Guam",MP:"Northern Mariana Islands"
};

function stars(n) {
  if (n == null || n === "" || Number.isNaN(Number(n))) return '<span class="muted">Not rated</span>';
  const v = Number(n);
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  let s = "★".repeat(full) + (half ? "½" : "") + "☆".repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
  return `<span class="stars" title="${v} of 5">${s}</span> <strong>${v.toFixed(1)}</strong>`;
}

function qs(k) { return new URLSearchParams(location.search).get(k) || ""; }

function headerHTML(active) {
  const link = (href, label, key) =>
    `<a href="${href}" ${active===key?'aria-current="page"':''}>${label}</a>`;
  return `
  <header class="site-header">
    <div class="wrap header-inner">
      <a class="logo" href="INDEX"><span class="mark">H</span><span>HomeAide</span></a>
      <button class="menu-btn" aria-label="Menu" onclick="document.getElementById('nav').classList.toggle('open')">☰</button>
      <nav class="nav" id="nav">
        ${link("search.html","Find an agency","search")}
        ${link("browse.html","Browse states","browse")}
        ${link("guides/index.html","Guides","guides")}
        ${link("about.html","Mission","about")}
        ${link("data.html","Our data","data")}
        <a class="btn" href="search.html">Search Medicare agencies</a>
      </nav>
    </div>
  </header>`;
}

function footerHTML() {
  return `
  <footer class="footer">
    <div class="wrap footer-grid">
      <div>
        <strong>HomeAide.org</strong>
        <p>A free public resource to help families find Medicare-certified home health agencies. Hosted by Modern Training Solutions as a non-revenue project.</p>
      </div>
      <div>
        <strong>Explore</strong><br>
        <a href="search.html">Search</a><br>
        <a href="browse.html">By state</a><br>
        <a href="guides/index.html">Guides</a>
      </div>
      <div>
        <strong>About</strong><br>
        <a href="about.html">Mission</a><br>
        <a href="data.html">Data &amp; methodology</a>
      </div>
      <div>
        <strong>Source</strong><br>
        <a href="https://data.cms.gov/provider-data/dataset/6jpm-sxkc">CMS Provider Data Catalog</a>
      </div>
    </div>
    <div class="wrap legal">
      HomeAide is not a Medicare contractor, not a placement agency, and not a nonprofit. Listings come from CMS public data (July 2026 Home Health Care Agencies file). Always confirm services, insurance, and availability with the agency. Ratings describe quality of patient care as published by Medicare; they are not endorsements.
    </div>
  </footer>`;
}

function fixNavRoots() {
  const inGuides = location.pathname.includes("/guides/");
  const root = inGuides ? "../" : "";
  document.querySelectorAll("header a, footer a").forEach(a => {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("#")) return;
    if (href === "INDEX") { a.setAttribute("href", root + "index.html"); return; }
    if (!href.startsWith("../") && !href.startsWith("/")) a.setAttribute("href", root + href);
  });
}

function mountChrome(active) {
  const h = document.getElementById("site-header");
  const f = document.getElementById("site-footer");
  if (h) h.outerHTML = headerHTML(active);
  if (f) f.outerHTML = footerHTML();
  fixNavRoots();
}

let CATALOG = null;
async function loadCatalog() {
  if (CATALOG) return CATALOG;
  const base = location.pathname.includes("/guides/") ? "../" : "";
  const res = await fetch(base + "data/catalog.json");
  CATALOG = await res.json();
  return CATALOG;
}

function matches(row, q, st, minStar, hhaOnly) {
  const [ccn, name, city, state, zip, phone, star, hha] = row;
  if (st && state !== st) return false;
  if (hhaOnly && !hha) return false;
  if (minStar && (star == null || Number(star) < minStar)) return false;
  if (!q) return true;
  const hay = `${name} ${city} ${state} ${zip} ${ccn}`.toLowerCase();
  const terms = q.toLowerCase().trim().split(/\s+/);
  return terms.every(t => hay.includes(t) || zip.startsWith(t));
}

function resultCard(row) {
  const [ccn, name, city, state, zip, phone, star, hha, nursing, pt] = row;
  const chips = [
    hha ? '<span class="chip">Home health aide</span>' : '<span class="chip off">No HHA listed</span>',
    nursing ? '<span class="chip">Nursing</span>' : "",
    pt ? '<span class="chip">Physical therapy</span>' : ""
  ].join("");
  return `<a class="agency-row" href="agency.html?ccn=${encodeURIComponent(ccn)}">
    <article class="card">
      <div>
        <div class="kicker">${city}, ${state} ${zip}</div>
        <h3>${name}</h3>
        <div>${stars(star)}</div>
        <div class="muted">${phone || ""} · CCN ${ccn}</div>
        <div>${chips}</div>
      </div>
      <div class="muted">View profile →</div>
    </article>
  </a>`;
}

async function runSearch() {
  const out = document.getElementById("results");
  if (!out) return;
  const cat = await loadCatalog();
  const q = (document.getElementById("q")?.value || qs("q")).trim();
  const st = document.getElementById("st")?.value || qs("st");
  const minStar = Number(document.getElementById("minStar")?.value || qs("minStar") || 0);
  const hhaOnly = document.getElementById("hhaOnly")?.checked || qs("hha") === "1";
  if (document.getElementById("q") && !document.getElementById("q").value) document.getElementById("q").value = q;
  if (document.getElementById("st") && st) document.getElementById("st").value = st;
  const hits = cat.rows.filter(r => matches(r, q, st, minStar, hhaOnly));
  document.getElementById("count").textContent =
    `${hits.length.toLocaleString()} agencies` + (q || st ? " matching your search" : " in the Medicare file");
  const show = hits.slice(0, 150);
  out.innerHTML = show.map(resultCard).join("") +
    (hits.length > 150 ? `<p class="muted">Showing the first 150 of ${hits.length.toLocaleString()}. Add a city, ZIP, or state to narrow results.</p>` : "");
}

async function fillStateSelect() {
  const sel = document.getElementById("st");
  if (!sel) return;
  const base = location.pathname.includes("/guides/") ? "../" : "";
  const states = await (await fetch(base + "data/states.json")).json();
  sel.innerHTML = `<option value="">All states</option>` + states.map(s =>
    `<option value="${s.st}">${STATE_NAMES[s.st] || s.st} (${s.count})</option>`).join("");
}

async function renderBrowse() {
  const el = document.getElementById("browse");
  if (!el) return;
  const states = await (await fetch("data/states.json")).json();
  el.innerHTML = states.map(s => `<a class="card" href="search.html?st=${s.st}">
    <div class="kicker">${s.st}</div>
    <h3>${STATE_NAMES[s.st] || s.st}</h3>
    <p>${s.count.toLocaleString()} agencies · ${s.hha.toLocaleString()} list home health aide services${s.avgStar ? ` · avg star ${s.avgStar}` : ""}</p>
  </a>`).join("");
}

function bar(label, val) {
  if (val == null) return `<div class="measure"><span>${label}</span><span class="muted">n/a</span><div class="bar"></div></div>`;
  const pct = Math.max(0, Math.min(100, Number(val)));
  return `<div class="measure"><span>${label}</span><span>${pct.toFixed(0)}%</span><div class="bar"><i style="width:${pct}%"></i></div></div>`;
}

function svcChips(svc) {
  const map = {nursing:"Nursing", pt:"Physical therapy", ot:"Occupational therapy", speech:"Speech", msw:"Medical social work", hha:"Home health aide"};
  return Object.entries(map).map(([k,l]) => `<span class="chip ${svc[k] ? "" : "off"}">${l}</span>`).join("");
}

async function renderAgency() {
  const el = document.getElementById("agency");
  if (!el) return;
  const ccn = qs("ccn");
  if (!ccn) { el.innerHTML = "<p>Missing agency id.</p>"; return; }
  const cat = await loadCatalog();
  const row = cat.rows.find(r => r[0] === ccn);
  if (!row) { el.innerHTML = "<p>We could not find that CMS Certification Number in the July 2026 file.</p>"; return; }
  const st = row[3];
  const list = await (await fetch(`data/states/${st}.json`)).json();
  const p = list.find(x => x.ccn === ccn);
  if (!p) { el.innerHTML = "<p>Profile data missing.</p>"; return; }
  document.title = `${p.name} · HomeAide.org`;
  const catLabel = (v) => v && v !== "-" ? v : "Not compared";
  el.innerHTML = `
    <p class="kicker"><a href="search.html?st=${p.st}">${STATE_NAMES[p.st] || p.st}</a> · Medicare-certified home health</p>
    <h1>${p.name}</h1>
    <p class="muted">${p.addr}<br>${p.city}, ${p.st} ${p.zip}<br>
      ${p.phone ? `<a href="tel:${p.phone.replace(/[^\d]/g,"")}">${p.phone}</a>` : "Phone not listed"} · CCN ${p.ccn}</p>
    <p>${stars(p.star)} quality of patient care (CMS)</p>
    <p>${svcChips(p.svc)}</p>
    <p class="muted">Ownership: ${p.own || "Not listed"} · Certified ${p.cert || "n/a"}</p>
    <div class="notice">This profile is built from the public CMS Home Health Care Agencies file. HomeAide has not independently verified hours, waitlists, or whether the agency is taking new patients. Call the agency to confirm.</div>
    <h2>Quality measures</h2>
    ${bar("Care started in a timely manner", p.timely)}
    ${bar("Patients improved walking", p.walk)}
    ${bar("Patients improved getting in and out of bed", p.bed)}
    ${bar("Patients improved bathing", p.bath)}
    ${bar("Patients improved breathing", p.breath)}
    ${bar("Patients improved taking oral medications", p.meds)}
    <h2>Compared with the national rate</h2>
    <ul>
      <li>Discharge to community: <strong>${catLabel(p.dtc)}</strong></li>
      <li>Potentially preventable readmissions: <strong>${catLabel(p.ppr)}</strong></li>
      <li>Potentially preventable hospitalizations: <strong>${catLabel(p.pph)}</strong></li>
    </ul>
    <p class="muted">Medicare spending per episode vs national average: ${p.spend != null ? p.spend.toFixed(2) : "n/a"} (1.00 = national average). Episodes used: ${p.episodes != null ? Math.round(p.episodes).toLocaleString() : "n/a"}.</p>
    <p><a class="btn" href="https://www.medicare.gov/care-compare/details.html?id=${encodeURIComponent(p.ccn)}&providerType=HomeHealth" target="_blank" rel="noopener">Open on Medicare Care Compare</a></p>
  `;
}

async function homeStats() {
  const el = document.getElementById("home-stats");
  if (!el) return;
  const s = await (await fetch("data/stats.json")).json();
  el.innerHTML = `
    <div><strong>${s.agencies.toLocaleString()}</strong>Medicare-certified agencies</div>
    <div><strong>${s.offersHha.toLocaleString()}</strong>list home health aide services</div>
    <div><strong>${s.states}</strong>states &amp; territories</div>
    <div><strong>${s.avgStar}</strong>average CMS star rating</div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page || "";
  mountChrome(page);
  fillStateSelect().then(() => {
    if (page === "search") runSearch();
  });
  if (page === "browse") renderBrowse();
  if (page === "agency") renderAgency();
  if (page === "home") homeStats();
  const form = document.getElementById("search-form");
  if (form) form.addEventListener("submit", (e) => {
    if (page === "search") {
      e.preventDefault();
      const q = document.getElementById("q").value;
      const st = document.getElementById("st")?.value || "";
      history.replaceState(null, "", `search.html?q=${encodeURIComponent(q)}&st=${encodeURIComponent(st)}`);
      runSearch();
    }
  });
  ["st","minStar","hhaOnly"].forEach(id => {
    const n = document.getElementById(id);
    if (n) n.addEventListener("change", () => { if (page === "search") runSearch(); });
  });
});
