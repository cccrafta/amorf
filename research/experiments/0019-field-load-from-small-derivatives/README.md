---
id: EXP-0019
title: Does the forms lab load fast when it fetches 256 px derivatives instead of full pictures?
date: 2026-11-15
status: running
question: Does fetching 256 px WebP derivatives instead of full pictures make the forms lab load fast, or does the request count still decide the load time?
hypothesis: The start load drops from 72.6 MB to under 3 MB and the time to the last form picture falls by more than half. It is wrong if the time stays close to the baseline with the same 169 requests, which would mean the request count, not the bytes, decides the load.
method: Read the lab's load line on /lab/forms before and after publishing the derivatives with entities:sync, on the same machine and network, with a cold and a warm browser cache.
materials: [forms-lab, entity-pictures]
tools: [imagemagick, webp, three-webgpu]
outcome:
decisions: [ADR-0020]
tags: [loading, performance, publish]
parts: [field]
media: []
publish: false
case_study: null
updated: 2026-11-15
last_verified: 2026-11-15
---

# EXP-0019: Does the forms lab load fast when it fetches 256 px derivatives instead of full pictures?

## Hypothesis

The lab draws every picture into a 256² layer (`LAYER` in `apps/web/components/forms-lab/config.ts`), so a picture whose short edge is 256 px carries everything that is drawn. Fetching that picture instead of the full one should cut the bytes by about 25 times and the time to the last form picture by more than half. If the time hardly moves, the 169 requests are the cost, and the next step is one texture array for the whole field (ADR-0020, the KTX2 option).

## Method

1. Baseline, before `entities:sync`: open `/lab/forms` and read the load line (requests, MB, first frame, pictures). Do it once with a cold cache (DevTools, Disable cache) and once warm.
2. Publish: `CLOUDFLARE_ACCOUNT_ID=… pnpm entities:sync` derives and uploads, then restart `pnpm dev` so the lab reads the new `entity.json`.
3. Repeat step 1.
4. Note the backend (WebGPU or WebGL 2), the browser and the network.

The load line counts requests and response bytes from `loadImage` (`texture-store.ts`), reset when the lab starts; bytes are body sizes, so a warm run shows the same MB with fewer network bytes (read DevTools Network for transfer size). Its times are milliseconds since navigation: "first frame" when the first render call returns (on WebGPU, pipelines may still compile after it), "pictures" when the last form picture (covers and satellites) has been attempted, failures included.

## Observations

- 2026-11-15, offline from `entity.json`: 34 entities; covers 34 files, 11.1 MB; satellites 135 files, 61.6 MB; start load 169 requests, 72.6 MB. All 176 pictures (board included) are 72.9 MB. The earlier figure of 894 MB was the whole content folder, videos included.
- 2026-11-15, `pnpm entities:derive`: 176 derivatives, 2.8 MB in total, about 8 s on the owner's machine. One sample: a 1743×2400 JPEG of 918 KB became 256×352 WebP of 18.6 KB.
- Source colour profiles: 134 untagged sRGB, 6 tagged sRGB, 8 Adobe RGB (1998), 9 display profiles (Color LCD, LED Cinema Display, Generic RGB, c2), 11 gray. Derivatives keep the ICC profile so the browser converts them as it does the full picture.
- Covers already load first: `layers.ts` lists every form's face pictures before any satellite picture. Nearest-first order is not built.

## Outcome

Not yet: the before and after load lines are outstanding.

## Next

- If the time to the last picture falls by more than half: accept ADR-0020; then a 64 px tier for the first frame only if the first frame still waits on pictures.
- If it does not: an experiment on one KTX2 texture array of covers and satellites with an index from entity to layer.
- Separately (plan B in the task note): calmer motion, one motion per level.
