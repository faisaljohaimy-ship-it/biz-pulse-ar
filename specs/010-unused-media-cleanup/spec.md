# Unused media cleanup — 2026-11-24

Owner instruction: continue `biz-pulse-ar`, delete unused videos/files to reduce
storage, and publish directly without CI. This small change uses the Spec Kit
method with one acceptance criterion; no generation/provider/database work.

## Acceptance

Remove only proven unused/duplicate media, source and dependencies, retain every active video and
format/resolution fallback, pass local gates and affected public browser checks,
then publish/verify the exact source revision on both production domains without
running CI. Do not claim speed gains without measurement or unavailable
voice/account/physical-device acceptance as complete.

## Audited removal manifest

| Removed path                                                            |      Bytes | Evidence                                                                                                             |
| ----------------------------------------------------------------------- | ---------: | -------------------------------------------------------------------------------------------------------------------- |
| `media-production/archive/welcome/sadeed-welcome-4a56e898.mp4`          | 11,488,594 | Retired component/URL; archive README confirms no runtime consumer.                                                  |
| `docs/design/reference/derived-archive/command-room-1280-previous.webp` |     54,304 | SHA-256 `b0d1b960aac5420d5f001f4fd98a5b3326b43539726f9aa244d6a5dc763db605` equals the retained current public image. |
| `public/home/finn-portrait.webp`                                        |     13,928 | HOME_IMAGES uses `finn-portrait-f70ca416.webp`; no runtime consumer of the unversioned copy.                         |
| `public/home/brand/sadeed-banner-clean-800.webp`                        |     27,350 | Identity model and film catalog use only the retained 1600 poster; no tier construction remains.                     |
| `public/home/brand/sadeed-banner-clean-1200.webp`                       |     49,818 | Same retained 1600 poster.                                                                                           |
| `public/home/brand/sadeed-banner-clean-2172.webp`                       |    118,866 | Same retained 1600 poster.                                                                                           |
| `public/home/brand/sadeed-emblem-mask.webp`                             |      1,060 | Retired CSS gem; historical generation recipe is not a runtime consumer.                                             |
| `public/brand/icons/sadeed-favicon-48.png`                              |      4,987 | Head/manifest use 16/32 PNG and ICO; ICO retains its 48px representation.                                            |

Total **11,758,907 bytes** of working-tree storage, including **216,009 bytes**
of public output. Removing the archive does not remove Git historical objects
or materially change current video traffic. No history rewrite/force push.
All twelve public videos, dynamic ticker variants, current owner originals,
narration/provenance inputs, source/tooling, tests and applied migrations remain.
The non-media audit found no tracked build/log/cache waste safe to remove.
The subsequent [dead-code audit](dead-code-audit.md) also removes five unused
source/CSS files (41,269 bytes) and five unused direct dependencies, pruning 91
lock entries without changing retained versions. Combined binary/source deletion:
**13 files / 11,800,176 bytes**, separately from installed dependency savings.

## Constitution and release boundary

Articles 4/5: same GitHub/Vercel source and protected build/geography/integration
files. Articles 7/8/10/11: no secrets, production data, provider calls or voice
substitution. Articles 16/17/18/27–29: local checks, independent guardian,
recoverable source and verified artifact; report measured savings separately
from unknown speed. The current explicit no-CI request overrides earlier CI
delivery wording without changing protection/workflow configuration.

Known-good artifact captured before cleanup:
`dpl_m8ydNx9GZf3DGgVQkeENM5kRCrAa`, revision
`e5681f2513f7f60390c9a5d608ed349b4b3c5321`; both domain aliases and write-free
live revision were observed. Release receipts belong in the final delivery
report after the new commit exists.

## Checkpoint

Implementation: eight audited binary and five audited source/CSS removals; five
unused direct dependencies removed with their exclusive lock entries. Legacy generator output moved to
ignored `.sadeed/video-out/`, with output-parent creation. README/rollback updated.
Final clean install, TypeScript, full ESLint, build, performance/contrast budgets,
secret scan and high-severity production audit passed. Public output is 45.83 MiB,
JavaScript 9.60 MiB, CSS 0.62 MiB, 699 files; ceilings were not raised.
The aggregate Vitest run completed with 464 passing files / one failing file:
8,653 passing tests, two failures and 30 pre-existing skipped tests. The first
failure was the loopback test's 5,000 ms timeout; the following test observed a
second late call. All 35 tests in that file passed in an isolated retry with
unchanged thresholds, assertions and source. This is resolved retry evidence,
not a claim of one entirely green aggregate run. The earlier pre-final-tree run
was interrupted to install the reduced dependency tree and is not acceptance.

Independent baseline Chromium checks on e5681f2 passed eight home combinations
(AR/EN, dark/light, 390/1280): no eager video, original MP4 decode, native controls,
no overflow or removed-URL requests, route-exit stop. Twin interaction remained
behind the required staff dialog. This is baseline evidence; staged/new release
identity, required HTML/assets and deleted-URL 404s must still be verified before
claiming delivery. The HTTP verifier rejected the old artifact because it still
served the removed portrait, providing a real negative control.

Knip remains advisory/nonzero for documented retained false positives and
pre-existing unlisted/unused exports. The final security audit reports no high
or critical findings; existing lower-severity findings remain. No real-database
RLS write tests, providers, voice generation or physical-device checks ran.
New commit/deployment/domain receipts belong in the final delivery report.
Existing 009 voice/account/device limitations remain separate.
