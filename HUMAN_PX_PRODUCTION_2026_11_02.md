# HUMAN Security (PerimeterX) — production deployment: transport cipher cracked + clean-IP bypass

Companion to `HUMAN_PX_ASSESSMENT_2026_10_31.md`. This covers the
**first-party-proxied** HUMAN sensor as deployed on a major publisher
(Bloomberg, appId `8FCGYgk4`, captured 2026-05-24) and demonstrates what the
the block-page assessment could not: **the whole transport is conquerable offline,**
and a **clean network identity wins an honest verdict**. Full archive writeup:
`artifacts/HUMAN.md`.

## 1. Deployment model — first-party proxied sensor

Unlike DataDome/FPJS (third-party), HUMAN runs **first-party** on the
publisher's own origin — third-party blockers and cookie defenses never see it:

- Bundle: `https://www.bloomberg.com/8FCGYgk4/init.js`
- Telemetry: `POST https://www.bloomberg.com/8FCGYgk4/xhr/api/v2/collector`
  → reverse-proxied to `collector-px8fcgygk4.px-cloud.net/api/v2/collector`
- State machine in **five cookies**: `_pxhd` (hard token), `_pxvid` (visitor
  id), `_px2`/`_px3` (verdict token), `pxcts` (timestamp), `_pxde` (data
  enrichment / embeds base64 JSON).

## 2. Wire format

`payload=<urlencoded-base64>` → base64-decode → decipher → JSON array of
telemetry batches:

```json
[{ "t": "<8-byte-base64 hash>", "d": { "<8-byte-base64 hash>": <value>, ... } }, ...]
```

`d` keys are **64-bit hashed signal names** — not human-readable. **~189
unique hashed names** across 13 captures; internal probe IDs surface raw as
`PX####` sub-keys (e.g. `{"PX12737":5}`).

## 3. Three layers of protection — each defeated offline

### 3.1 Transport cipher — single-byte XOR `0x32` (no key, no MAC)
Recovered by **common-prefix analysis**: 13 captured bodies share a constant
7-byte prefix `69 49 10 46 10 08 10`; a printable-ratio XOR sweep ranks `0x32`
top, and XOR-`0x32` of the prefix yields `[{"t":"` — valid JSON.
`scripts/pcx/decrypt.mjs` decodes every body.

### 3.2 String obfuscation — base91 (not base64) + lazy decoder
Permuted 91-char alphabet + obfuscated string array; `kb()` is a textbook
base91 decoder. `scripts/pcx/decode-strings.mjs` recovers all entries
(navigator, userAgent, collector path…). Extracted alphabet begins `uGsyV!r(ZajH3{…`,
1,180 entries.

### 3.3 Hashed signal names — structural recovery (~75 / 189)
Each hash is a string literal at the call site where its value is computed
(`o.d["AhIwWEd1PWo="]=(new Date).getTime()`), so a ±200-byte context window +
resolved strings recovers meaning for ~75 of 189 names
(`scripts/pcx/build-dictionary.mjs`).

## 4. Signals collected
navigator (UA, platform, hardwareConcurrency, deviceMemory, maxTouchPoints,
webdriver), screen/viewport, canvas/WebGL/AudioContext, behavioral
(mouse/touch/keydown/pointer + MutationObserver), CDP/automation tells
(`cdc_`, `automationControlled`, `HeadlessChrome`, phantom/selenium),
workers/iframes, storage, connection/effectiveType/rtt — plus a live JS
**exception stack trace** signal (exposes VM frames; caught a co-resident
reCAPTCHA frame).

## 5. The bypass result — clean IP beats the sensor

`scripts/pcx/bypass.mjs`: **vanilla real Chrome** + humanlike mouse/scroll via
a residential/mobile exit → **HTTP 200, full article, no `#px-captcha`** —
emitting a fully *honest* ~189-signal payload that openly includes
automation-adjacent fields. No tampering: the genuine payload passed.

**The lesson:** HUMAN's strongest signal is the **network identity**, not the
browser fingerprint — and the two are gated independently. The expensive,
heavily-obfuscated client sensor (base91 strings, hashed names, XOR transport,
inner blob layer) is mostly evidence collection for a server-side model; the
decisive, cheap gate is **IP reputation + TLS/JA4 + a plausible real browser**.
Corollary: if an honest fingerprint over a clean IP wins, the client-side
obfuscation is theater — the defender must score the *network identity* and
demand *positive* proof-of-humanity.

## 6. Assessment (this deployment)

- **Read payload:** 🟢 — transport XOR-`0x32` cracked (common-prefix), all
  bodies decoded; **base91** string table extracted; ~75/189 hashed signal
  names mapped.
- **Tamper with payload:** 🟢/🟡 — the wire is trivially re-encodable
  (XOR + base64, no MAC), but the verdict is decided server-side on
  IP/TLS/UA + sensor output; inner blob layer on some fields not fully
  inverted.
- **Mint / verdict:** 🟢 (this deployment) — a **clean network identity
  (residential/mobile exit) + real Chrome + honest payload** passes
  (`HTTP 200`, article served, no captcha).

## 7. Honest boundaries
- The inner encoding on some long fingerprint blobs was **not** fully
  recovered (the XOR window garbles after a prefix on those specific values).
- The single-byte XOR transport is claim-specific (this deployment); other
  appIds/dates may vary.
- Whether the clean-IP pass changes the *numeric* risk verdict (vs. the
  geo/IP-block gate) is inferred from the observable outcome (200 + no
  captcha), not from HUMAN's internal score.