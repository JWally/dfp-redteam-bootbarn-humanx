# dfp-redteam-human-px — HUMAN Security / PerimeterX

Full details in `HUMAN_PX_ASSESSMENT_2026_10_31.md`.

---

## What we observed (the shipped payload)

**Plaintext collector telemetry captured at the JSON boundary.** Key facts:

- PX-Show block deployment, 8-host stack, base91 string table decoded (525
  entries).
- **Plaintext collector telemetry** read at the JSON boundary.
- Embedded **WebGL shader fingerprint**.
- **Clean-launch real Chrome loads the full storefront** — the launch
  signature (UA/software-GL/behavior) is what the server scores, not the
  payload.
- No client-mintable proof: server decides + captcha fallback.

## Status

- 🟢 Read payload: plaintext collector telemetry at the JSON boundary
- 🔴 Tamper with payload: client-readable but no client-mintable proof; server scores the launch
- 🔴 Mint token: server decides (launch/UA/GL/behavior) + captcha fallback

## Production deployment (Bloomberg) — transport cipher cracked + clean-IP bypass

Beyond the block-page assessment, the **first-party-proxied** HUMAN sensor on a
major publisher was fully conquered offline
(`HUMAN_PX_PRODUCTION_2026_11_02.md`, archive writeup in `artifacts/HUMAN.md`):

- **Transport cipher = single-byte XOR `0x32`** — no key, no MAC; recovered
  via common-prefix analysis (constant 7-byte prefix → `[{"t":"`), every
  collector body decoded (`scripts/pcx/decrypt.mjs`, 13 decrypted bodies in
  `artifacts/pcx/decrypted/`).
- **base91** (not base64) string table extracted (1,180 entries); **~75/189
  hashed signal names** mapped structurally (`scripts/pcx/build-dictionary.mjs`).
- **The bypass result:** a **clean network identity beats the sensor** —
  vanilla real Chrome + residential/mobile exit + a fully *honest* ~189-signal
  payload → **HTTP 200, no captcha** (`scripts/pcx/bypass.mjs`).
  HUMAN's decisive gate is **IP/TLS/JA4 + a plausible browser**, not the
  browser fingerprint; the client obfuscation is evidence-collection theater.

**Read:** 🟢 (XOR cracked, all bodies decoded) · **Tamper:** 🟢/🟡 (re-encodable,
verdict server-side) · **Mint/verdict (this deployment):** 🟢 (clean IP +
real Chrome + honest payload passes).

## Files

- writeup: `HUMAN_PX_ASSESSMENT_2026_10_31.md`
- scripts/artifacts per the writeup
