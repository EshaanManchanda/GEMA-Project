# Firewall Unblock Runbook — Kidrove

> **Problem:** Corporate firewalls are blocking kidrove.com, likely misclassified as "Games" or "Gambling" because event titles contain words like "game" (e.g. "Build a Bubble Popping Game in Scratch").
>
> **Root cause:** This is a **reputation and categorization** issue, not a security or code issue. The site is already hardened with Helmet, HSTS, strict CORS, rate limiting, comprehensive JSON-LD, legal pages, and robots/sitemaps.

---

## Step 0: Gather Block Details (REQUIRED FIRST)

Ask the affected client for:

| Info needed | Why |
|---|---|
| Screenshot of the block page | Identifies the firewall vendor and assigned category |
| Exact URL being blocked | May be a specific page or the whole domain |
| Firewall product name | Determines which recategorization portal to use |
| Category assigned to the site | e.g. "Games", "Gambling", "Uncategorized" |

**Without the category, the recategorization step is guesswork.**

---

## Step 1: Cloudflare Fronting (Highest Impact)

Many corporate firewalls trust Cloudflare edge IPs more than raw hosting IPs (e.g. Render). Putting all domains behind Cloudflare often resolves the block immediately.

### DNS Setup

For each domain (`kidrove.com`, `kidrove.in`, `kidrove.ae`):

1. Sign up / log in at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Add the domain, select the Free or Pro plan
3. Update nameservers at your registrar to Cloudflare's assigned nameservers
4. For the frontend (Vercel): add a CNAME record `@` → `cname.vercel-dns.com` with **Proxy enabled** (orange cloud)
5. For the API: add a CNAME record `api` → `gema-project.onrender.com` with **Proxy enabled** (orange cloud)

### Enable These Settings

| Setting | Location | Value |
|---|---|---|
| Proxy DNS | DNS → each record | Orange cloud ON |
| SSL/TLS | SSL/TLS → Overview | **Full (Strict)** |
| Always Use HTTPS | SSL/TLS → Edge Certificates | ON |
| HTTP/3 | Network | ON |
| WAF | Security → WAF | ON (Managed Rules) |
| Super Bot Fight Mode | Security → Bots | ON |
| Browser Integrity Check | Security → Settings | ON |
| Rate Limiting | Security → WAF → Rate Limiting Rules | Configure as needed |

### Hide the Render Origin

After Cloudflare is set up, the raw `gema-project.onrender.com` URL should NOT appear in any public-facing output. All references should use `https://api.kidrove.com` instead. (Code changes for this are tracked separately.)

---

## Step 2: Reputation Scans

Run these scans for **each domain** (`kidrove.com`, `kidrove.in`, `kidrove.ae`, `api.kidrove.com`) and record the results:

| Service | URL | What to check |
|---|---|---|
| Google Safe Browsing | https://transparencyreport.google.com/safe-browsing/search | Should show "No unsafe content found" |
| VirusTotal | https://www.virustotal.com/gui/home/url | Should show 0 detections |
| FortiGuard | https://www.fortiguard.com/webfilter | Category should be "Education" not "Games" |
| Cisco Talos | https://talosintelligence.com/reputation_center | Reputation should be "Favorable" or "Neutral" |
| URLVoid | https://www.urlvoid.com/ | Should show 0 blacklist detections |
| Sucuri SiteCheck | https://sitecheck.sucuri.net/ | Should show clean |
| Spamhaus | https://check.spamhaus.org/ | IP should not be listed |
| MXToolbox | https://mxtoolbox.com/blacklists.aspx | Check IP blacklists |
| Microsoft SmartScreen | Test in Edge browser | Should not show warning |

### Record Results

| Domain | Service | Category/Status | Date Checked | Notes |
|---|---|---|---|---|
| kidrove.com | FortiGuard | ___ | ___ | ___ |
| kidrove.com | Cisco Talos | ___ | ___ | ___ |
| kidrove.com | VirusTotal | ___ | ___ | ___ |
| ... | ... | ... | ... | ... |

---

## Step 3: Recategorization Requests

Submit to **every major vendor**, not just the one blocking you — proactive recategorization prevents future blocks.

### Justification Template

Use this paragraph when submitting:

> **Site:** kidrove.com (also kidrove.in, kidrove.ae)
>
> **Requested Category:** Education / Children's Education / Family & Parenting
>
> **Justification:** Kidrove is an educational platform for children's activities, STEM workshops, coding classes, and family events in the UAE. Pages titled "Build a Bubble Popping Game in Scratch" and "How to Make a Chase Game in Scratch" teach children computer programming using MIT Scratch — a visual programming language developed by MIT Media Lab for education. No betting, wagering, gambling, or gaming services are offered. The platform is used by schools, teachers, and parents to find and book educational activities for children.
>
> **Evidence:**
> - Privacy Policy: https://kidrove.com/privacy
> - Terms of Service: https://kidrove.com/terms
> - About Us: https://kidrove.com/about
> - Schema.org EducationalOrganization markup on all pages
> - Google Rich Results showing Course and Event structured data

### Per-Vendor Submission

#### FortiGuard (Fortinet)
- **Lookup:** https://www.fortiguard.com/webfilter
- **Recategorize:** https://www.fortiguard.com/faq/wfratingsubmit
- **Expected response:** 1-3 business days
- **Ticket ID:** ___

#### Cisco Talos
- **Lookup:** https://talosintelligence.com/reputation_center/lookup
- **Recategorize:** https://talosintelligence.com/reputation_center — click "Submit a Ticket"
- **Expected response:** 1-5 business days
- **Ticket ID:** ___

#### Palo Alto Networks (PAN-DB)
- **Lookup:** https://urlfiltering.paloaltonetworks.com/
- **Recategorize:** https://urlfiltering.paloaltonetworks.com/ — "Request Change" button
- **Expected response:** 2-5 business days
- **Ticket ID:** ___

#### Sophos
- **Lookup:** https://support.sophos.com/support/s/
- **Recategorize:** Email sophos-url-submission@sophos.com with the domain and justification
- **Expected response:** 3-7 business days
- **Ticket ID:** ___

#### Zscaler
- **Lookup:** https://sitereview.zscaler.com/
- **Recategorize:** https://sitereview.zscaler.com/ — "Submit for Review"
- **Expected response:** 1-3 business days
- **Ticket ID:** ___

#### McAfee (Trellix)
- **Lookup:** https://trustedsource.org/
- **Recategorize:** https://trustedsource.org/ — "Check URL" then "Submit for Review"
- **Expected response:** 3-5 business days
- **Ticket ID:** ___

#### Trend Micro
- **Lookup:** https://global.sitesafety.trendmicro.com/
- **Recategorize:** https://global.sitesafety.trendmicro.com/ — "Reclassify URL"
- **Expected response:** 1-3 business days
- **Ticket ID:** ___

#### Symantec / Broadcom (BlueCoat)
- **Lookup:** https://sitereview.bluecoat.com/
- **Recategorize:** https://sitereview.bluecoat.com/ — submit review request
- **Expected response:** 2-5 business days
- **Ticket ID:** ___

#### Microsoft SmartScreen
- **Lookup:** Test in Microsoft Edge browser
- **Recategorize:** https://www.microsoft.com/en-us/wdsi/support/report-unsafe-site-guest — report as incorrectly flagged
- **Expected response:** 1-7 business days
- **Ticket ID:** ___

---

## Step 4: Content Trigger-Word Audit

Corporate firewalls use keyword-based heuristics. Event titles containing "game", "win", "prize" can trigger gaming/gambling classification.

### Run the Audit Script

```bash
cd backend
npx ts-node src/scripts/auditTriggerWords.ts
```

This generates a CSV of flagged events with suggested replacements.

### Safe Alternatives

| Avoid | Better |
|---|---|
| Game | Coding Project |
| Win | Learn |
| Reward | Achievement |
| Challenge | Activity |
| Bubble Popping Game | Bubble Pop Animation |
| Chase Game | Character Movement Project |
| Minecraft Game | Minecraft STEM Workshop |
| Build a Game | Build an Interactive Project |

### Best Practices for New Event Titles

- Lead with the educational outcome: "Learn Scratch Programming: Bubble Pop Project"
- Include "Workshop", "Class", "Course", "STEM" in titles
- Mention the tool/platform: "with Scratch", "using Python", "in Minecraft Education"
- Avoid standalone "game" without educational context

---

## Step 5: Weekly Reputation Monitoring

Re-scan all domains weekly for the first month, then monthly. Track trends.

### Checklist

- [ ] Google Safe Browsing — all domains clean
- [ ] VirusTotal — 0 detections all domains
- [ ] FortiGuard — category is "Education"
- [ ] Cisco Talos — reputation "Favorable"
- [ ] Microsoft SmartScreen / Edge — no warning
- [ ] Sucuri SiteCheck — clean
- [ ] URLVoid — 0 blacklists

### Historical Log

| Date | Domain | Service | Status | Notes |
|---|---|---|---|---|
| ___ | ___ | ___ | ___ | ___ |

---

## Code Changes (Reference)

These are tracked in the codebase, not in this runbook:

- **CSP Report-Only** — enabled in `backend/src/server.ts` (Content-Security-Policy-Report-Only header)
- **EducationalOrganization schema** — site-wide Organization type upgraded in `index.html` and `SEO.tsx`
- **Course/HowTo structured data** — educational events now emit Course + HowTo JSON-LD
- **onrender.com references removed** — all public-facing URLs point to `kidrove.com` / `api.kidrove.com`
- **Permissions-Policy + CORP + COOP headers** — added to backend
- **Trigger-word audit script** — `backend/src/scripts/auditTriggerWords.ts`

---

## Expected Timeline

| Action | Timeline | Blocker |
|---|---|---|
| Cloudflare fronting | 1-2 hours | DNS propagation (up to 48h) |
| Reputation scans | 30 minutes | None |
| Recategorization requests | 1-7 business days per vendor | Need block-page screenshot first |
| Content trigger-word fixes | 1-2 hours | Admin applies in dashboard |
| Code changes (schema, headers) | Already done | Deploy to production |

**Most likely outcome:** Cloudflare fronting + FortiGuard/Talos recategorization will resolve the block within 1-5 business days.
