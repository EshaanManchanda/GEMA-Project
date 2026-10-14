"""Regenerate AUDIT.html (repo root): what changed between aditya and
backend_auth, from template.html + fixes.json + git.

Usage (from anywhere): python scripts/audit/gen.py
Run after each commit on backend_auth; add the commit's fixes and manual
checks to fixes.json first, and update "testsPassing" after a full run.
"""
import html, json, subprocess, sys
from collections import OrderedDict
from pathlib import Path

HERE = Path(__file__).parent
REPO = str(HERE.parents[1])
BASE = "aditya"
E = html.escape


def git(*args):
    return subprocess.run(["git", "-C", REPO, *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout


data = json.loads((HERE / "fixes.json").read_text(encoding="utf-8"))
TESTS = data["testsPassing"]
tpl = (HERE / "template.html").read_text(encoding="utf-8")

head = git("rev-parse", "--short", "HEAD").strip()
commits = git("rev-list", "--count", "--no-merges", f"{BASE}..HEAD").strip()
base_sha = git("rev-parse", "--short", BASE).strip()
pushed = git("branch", "-r", "--contains", "HEAD").strip()

# ── files ────────────────────────────────────────────────────────────────
status = {}
for line in git("diff", "--name-status", "-M", BASE, "HEAD").splitlines():
    parts = line.split("\t")
    code = parts[0][0]
    if code == "R":
        status[parts[2]] = ("ren", parts[1])
    else:
        status[parts[1]] = ({"A": "new", "M": "mod", "D": "del"}.get(code, "mod"), None)
delta = {}
for line in git("diff", "--numstat", "-M", BASE, "HEAD").splitlines():
    a, d, path = line.split("\t", 2)
    if "=>" in path:  # rename: "dir/{old => new}" or "old => new"
        if "{" in path:
            pre, rest = path.split("{", 1)
            mid, post = rest.split("}", 1)
            path = pre + mid.split(" => ")[1] + post
        else:
            path = path.split(" => ")[1]
    delta[path] = (a, d)

GROUPS = [
    ("Backend · controllers", lambda p: "/controllers/" in p and p.startswith("backend/")),
    ("Backend · services", lambda p: p.startswith("backend/src/services/")),
    ("Backend · routes", lambda p: "/routes/" in p and p.startswith("backend/")),
    ("Backend · models", lambda p: p.startswith("backend/src/models/")),
    ("Backend · tests", lambda p: p.startswith("backend/src/tests/") or p.startswith("backend/jest")),
    ("Backend · workers", lambda p: p.startswith("backend/src/workers/")),
    ("Backend · scripts & seeds", lambda p: p.startswith("backend/src/scripts/")),
    ("Backend · core (server, config, middleware, utils)", lambda p: p.startswith("backend/src/")),
    ("Backend · package & config files", lambda p: p.startswith("backend/")),
    ("Frontend · E2E tests", lambda p: p.startswith("frontend/e2e/") or p == "frontend/playwright.config.ts"),
    ("Frontend · images", lambda p: p.startswith("frontend/public/")),
    ("Frontend · app code", lambda p: p.startswith("frontend/src/")),
    ("Frontend · build & package", lambda p: p.startswith("frontend/")),
    ("Deploy, nginx & ops", lambda p: p.startswith(("deployment/", "scripts/")) or p in ("deploy.sh", "setup-server.sh", "DEPLOY_RUNBOOK.md")),
    ("Docker & repo", lambda p: True),
]
LABEL = {"new": "Added", "mod": "Modified", "del": "Deleted", "ren": "Renamed"}
grouped = OrderedDict((g, []) for g, _ in GROUPS)
for path in sorted(status):
    for g, test in GROUPS:
        if test(path):
            grouped[g].append(path)
            break

def row(path):
    st, was = status[path]
    a, d = delta.get(path, ("-", "-"))
    dcell = "binary" if a == "-" else f'<span class="plus">+{a}</span> <span class="minus">−{d}</span>'
    wasp = f'<span class="was">was {E(was)}</span>' if was else ""
    return f'<tr><td><span class="st {st}">{LABEL[st]}</span></td><td class="path">{E(path)}{wasp}</td><td class="delta">{dcell}</td></tr>'

counts = {k: sum(1 for v in status.values() if v[0] == k) for k in LABEL}
groups_html = "".join(
    f'<details class="fgroup"><summary><span>{E(g)}</span><span class="count">{len(ps)}</span></summary>\n'
    f'<div class="tablewrap"><table class="files"><tbody>{"".join(row(p) for p in ps)}</tbody></table></div></details>'
    for g, ps in grouped.items() if ps
)
files = f'''<section class="block" id="files">
  <div class="sectionhead">
    <h2>Files updated</h2>
    <p>{len(status)} files: {counts["new"]} added, {counts["mod"]} modified, {counts["del"]} deleted, {counts["ren"]} renamed. Generated from <code>git diff --name-status {BASE} {head}</code>. Uncommitted local files aren't included.</p>
  </div>
  <div>{groups_html}</div>
</section>'''

# ── round 2 issues ───────────────────────────────────────────────────────
order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
areas = OrderedDict()
for i in sorted(data["issues"], key=lambda x: order[x["sev"]]):
    areas.setdefault(i["area"], []).append(i)
round2 = (
    '<div class="sectionhead"><h3>Second hardening pass <span class="count">'
    f'{len(data["issues"])}</span></h3><p>Found and fixed after <code>1650ae4</code>, each with a regression test that fails on the old code. '
    'Most were found by the new automated checks: a route-auth matrix that calls every API route without login, and an ownership (IDOR) suite.</p></div>\n'
)
for area, items in areas.items():
    lis = "".join(
        f'<li class="issue"><span class="sev {i["sev"]}">{i["sev"].title()}</span><div class="ibody"><h4>{E(i["title"])}</h4>'
        f'<p>{E(i["text"])}</p></div><code class="commit">{E(i["commit"])}</code></li>'
        for i in items
    )
    round2 += f'<section class="igroup"><h3>{E(area)} <span class="count">{len(items)}</span></h3><ul class="issues">{lis}</ul></section>\n'
round2 += '<div class="sectionhead"><h3>Earlier fixes</h3></div>\n'

tests2 = '<div class="tests">' + "".join(
    f'<article class="test"><header><h4>{E(t["title"])}</h4><span class="where">{E(t["where"])}</span></header>\n'
    f'<ol>{"".join(f"<li>{E(s)}</li>" for s in t["steps"])}</ol><p class="expect"><span>Expected</span>{E(t["expect"])}</p></article>'
    for t in data["tests"]
) + "</div>"

crit = 4 + sum(1 for i in data["issues"] if i["sev"] == "critical")
high = 8 + sum(1 for i in data["issues"] if i["sev"] == "high")
stats = f'''<div class="stats">
  <div class="stat"><span class="n">{commits}</span><span class="l">commits</span></div>
  <div class="stat"><span class="n">{len(status)}</span><span class="l">files changed</span></div>
  <div class="stat"><span class="n">{crit}</span><span class="l">critical issues fixed</span></div>
  <div class="stat"><span class="n">{high}</span><span class="l">high issues fixed</span></div>
  <div class="stat"><span class="n">{E(TESTS)}</span><span class="l">backend tests passing (last full run)</span></div>
</div>'''

refs = (f'<div class="refs"><span>Base <b>{BASE} @ {base_sha}</b></span><span>Head <b>backend_auth @ {head}</b></span>'
        f'<span>{"Pushed" if pushed else "Not pushed yet"}</span></div>')

verdict = '''<aside class="verdict">
  <h2>Ready for public users?</h2>
  <p>Not until this branch is deployed: production still runs the old build, which has every issue listed below. Launch once these are done:</p>
  <ol>
    <li>Push <code>backend_auth</code>. On the server run <code>npm run check:predeploy</code> against production and fix what it flags (run <code>migrateEventVendorIds</code> if it reports bad vendor links).</li>
    <li>Run <code>./deploy.sh</code> and apply the nginx files in the same window, then reload nginx.</li>
    <li>Regenerate review links for any event whose link was already shared (old links have no token).</li>
    <li>Make one real paid booking, check the ticket and email arrive, then refund it.</li>
  </ol>
</aside>'''

autonote = ('<p class="note">Automated checks: in backend/, <code>npx jest</code> (one in-memory MongoDB replica set per run, '
            'started by jest.globalSetup.js; no env setup needed). In frontend/, <code>npx playwright test</code>. '
            'This page is regenerated with <code>python scripts/audit/gen.py</code>.</p>')

out = (tpl.replace("<!--REFS-->", refs).replace("<!--STATS-->", stats).replace("<!--VERDICT-->", verdict)
       .replace("<!--ROUND2-->", round2).replace("<!--TESTS2-->", '<h3>Checks for the second pass</h3>\n' + tests2 + '\n<h3>Earlier checks</h3>')
       .replace("<!--AUTONOTE-->", autonote).replace("<!--FILES-->", files))
assert "<!--" not in out.replace("<!doctype", ""), "unreplaced marker"
(Path(REPO) / "AUDIT.html").write_text(out, encoding="utf-8")
print(f"head {head} commits {commits} files {len(status)} crit {crit} high {high}")
