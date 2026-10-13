#!/usr/bin/env python3
"""Point homeaide.org at the Pages project. Needs Zone.DNS Edit."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "285386d91f5a09b228c71db3ee3cabad")
TOKEN = os.environ.get("CLOUDFLARE_DNS_TOKEN") or os.environ.get("CLOUDFLARE_API_TOKEN")
ZONE_NAME = "homeaide.org"
PAGES = "homeaide-org.pages.dev"
PARKING = {"3.33.130.190", "15.197.148.33"}


def call(method: str, url: str, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"raw": raw[:500]}
        return e.code, parsed


def main() -> int:
    if not TOKEN:
        print("missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_DNS_TOKEN", file=sys.stderr)
        return 2
    code, zones = call("GET", f"https://api.cloudflare.com/client/v4/zones?name={ZONE_NAME}")
    if code != 200 or not zones.get("success") or not zones.get("result"):
        print("zone lookup failed", code, zones.get("errors") or zones)
        return 1
    zid = zones["result"][0]["id"]
    print("zone", zid, "status", zones["result"][0].get("status"))
    code, recs = call(
        "GET", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records?per_page=100"
    )
    if code != 200 or not recs.get("success"):
        print("dns list failed", code, recs.get("errors") or recs)
        return 1
    for r in recs.get("result") or []:
        rtype, name, content = r.get("type"), r.get("name"), r.get("content")
        rid = r.get("id")
        drop = False
        if rtype == "A" and content in PARKING:
            drop = True
        if rtype == "CNAME" and name in (ZONE_NAME, f"www.{ZONE_NAME}") and content.rstrip(".") in {
            ZONE_NAME,
            f"www.{ZONE_NAME}",
        }:
            drop = True
        print(f"  {rtype} {name} -> {content} proxied={r.get('proxied')}")
        if drop:
            dcode, dbody = call(
                "DELETE", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records/{rid}"
            )
            print("  deleted", dcode, dbody.get("success"))
            if not dbody.get("success"):
                return 1

    wanted = [
        {"type": "CNAME", "name": "@", "content": PAGES, "proxied": True, "ttl": 1},
        {"type": "CNAME", "name": "www", "content": PAGES, "proxied": True, "ttl": 1},
    ]
    code, recs = call(
        "GET", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records?per_page=100"
    )
    existing = {(r.get("type"), r.get("name")): r for r in recs.get("result") or []}
    for rec in wanted:
        fqdn = ZONE_NAME if rec["name"] == "@" else f"{rec['name']}.{ZONE_NAME}"
        key = ("CNAME", fqdn)
        cur = existing.get(key)
        if cur and cur.get("content", "").rstrip(".") == PAGES:
            print("keep", fqdn, "->", PAGES)
            continue
        if cur:
            dcode, dbody = call(
                "DELETE",
                f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records/{cur['id']}",
            )
            print("replace-delete", fqdn, dcode, dbody.get("success"))
        pcode, pbody = call(
            "POST", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records", rec
        )
        print("create", fqdn, pcode, pbody.get("success"), pbody.get("errors"))
        if not pbody.get("success"):
            return 1

    for host in (ZONE_NAME, f"www.{ZONE_NAME}"):
        pcode, pbody = call(
            "POST",
            f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/pages/projects/homeaide-org/domains",
            {"name": host},
        )
        print("pages domain", host, pcode, pbody.get("success"), pbody.get("errors"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
