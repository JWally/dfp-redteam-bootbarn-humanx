# dfp-redteam-bootbarn-humanx — HUMAN Security / PerimeterX (BootBarn.com)

Full details in `BOOTBARN_HUMANX_ASSESSMENT_2026_10_31.md`.

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

## Files

- writeup: `BOOTBARN_HUMANX_ASSESSMENT_2026_10_31.md`
- scripts/artifacts per the writeup
