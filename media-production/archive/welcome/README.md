# Retired welcome film — Git recovery record

The unused historical film was removed from the working tree on 2026-11-24
under the owner's repository/storage cleanup instruction. It remains recoverable
from commit `e5681f2513f7f60390c9a5d608ed349b4b3c5321` at
`media-production/archive/welcome/sadeed-welcome-4a56e898.mp4`.

- Size: 11,488,594 bytes.
- SHA-256: `4a56e89873c0aa157fefcd00e3008ff4782c0016525e6cdfb613dfee5e8d409a`.
- Former served URL: `/sadeed-welcome.mp4`.

The old welcome component is removed and no current runtime catalog or client
references that URL. The earlier archive move had already removed its served
copy; this cleanup reduces repository checkout size, not current video traffic.

The legacy manual generator now defaults to ignored
`.sadeed/video-out/sadeed-welcome-derived.mp4`. Do not use that historical pipeline
to overwrite the new identity exports. A deployment rollback restores the old
artifact's URLs; restoring this one legacy URL separately requires copying this
verified Git blob back to its former served path in a reviewed source change.
