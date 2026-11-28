# Headroom context engineering

This opt-in developer tool prepares selected tool JSON and logs through the local
Python SDK. Code, policy, protected role envelopes and short inputs pass through.
The original is retained separately and verified by SHA256 on retrieval. Product
runtimes, model routing, authentication and deployment remain independent.

The registry entry is **APPROVED for the scoped local SDK path** after independent
launcher, preservation, concurrency and retrieval tests. This does not approve
every integration or install the dependency into every project. The new skill
adds to the existing thirteen skills; all 430 implemented motions remain preserved.

## Version and environment

Use `headroom-ai==0.45.0` (Python 3.11+), upstream tag `v0.45.0` at
[`ce0460cfa8598dc939243dbc7aec4b2d35f4e44a`](https://github.com/headroomlabs-ai/headroom/tree/ce0460cfa8598dc939243dbc7aec4b2d35f4e44a).
The import is `headroom`; the unrelated PyPI distribution named `headroom` is not
the selected package. The project uses Apache-2.0; retain LICENSE/NOTICE and review
resolved dependencies and optional model licenses separately.

Use a standalone private venv and reviewed hash-pinned wheel closure. An initial
task-local gate reviewed hashes, advisory metadata and notices for 68 wheels; it
is not a full native-binary audit or permanent security approval. Installation is
a separate reviewed operation. The Hub's standard-library launcher can report an
unavailable SDK without installing it. Invoke the chosen venv's Python directly;
there is no interpreter-selection environment variable or alternate-interpreter
flag. The sibling worker uses the same `sys.executable` with `-I`. A vendored tool
must include **both** `headroom_context.py` and `headroom_worker.py`.

At the Hub root, `integrations/headroom/README.md` gives the hash-locked
CPython 3.12 Linux x86_64 installation commands. After selective project adoption,
the same hash lock is `.engineering/headroom/requirements.lock`.
`pack:headroom-context` selectively copies the two scripts, hash lock, operating
guide and identical `.agents`/`.claude` instruction skill. Registration installs
no third-party dependency. Use the existing `hub.py register --help` interface
with a full reviewed merged commit and `--capability pack:headroom-context`;
inspect its dry run before `--apply`. Existing project instructions stay owned by
the project. The SDK core version and existing project pins are unchanged.

The SDK regime is `densify()` / `compress(mode="agent")`, with system/user
compression explicitly false, ML disabled and per-message round-trip verification.
Unknown/unproven compression falls back to original content. The launcher/worker
must set offline mode, disable beacon/telemetry and keep state in private task
directories using `HEADROOM_WORKSPACE_DIR` and `HEADROOM_CONFIG_DIR`. Do not change
`HOME`, `CODEX_HOME`, existing account configuration or provider credentials.
Per-resource legacy environment overrides take precedence over those state roots;
use a controlled child environment. Runtime network-denial status is evidence,
not something to infer from an environment variable alone.

## Commands

Run these from the Hub checkout, using the reviewed venv's Python. `status` accepts
an optional store; optimization and retrieval require an absolute private store
outside every Git repository. No command here starts an HTTP proxy or registers MCP.

```sh
/path/to/reviewed-venv/bin/python tools/headroom_context.py status
/path/to/reviewed-venv/bin/python tools/headroom_context.py optimize --input /absolute/private/tool-output.json --store /absolute/private/headroom-store --kind tool-json
/path/to/reviewed-venv/bin/python tools/headroom_context.py optimize --input /absolute/private/build.log --store /absolute/private/headroom-store --kind log
/path/to/reviewed-venv/bin/python tools/headroom_context.py status --store /absolute/private/headroom-store
/path/to/reviewed-venv/bin/python tools/headroom_context.py retrieve --store /absolute/private/headroom-store --id ORIGINAL_SHA256 --query failure
/path/to/reviewed-venv/bin/python tools/headroom_context.py retrieve --store /absolute/private/headroom-store --id ORIGINAL_SHA256 --full
```

### From an independently registered product

The selected pack stores both scripts, this guide and the dependency lock under
`.engineering/headroom/`. Run these commands from the product root. Create the
private parent directories outside Git first; do not put the venv or original
store inside the product or commit their contents. Installation below applies to
the reviewed CPython 3.12 Linux x86_64 closure and requires package-download access;
optimization itself runs with the worker's no-IP boundary.

```sh
python3.12 -m venv /absolute/private/headroom-venv
/absolute/private/headroom-venv/bin/python -m pip --isolated install --disable-pip-version-check --only-binary=:all: --require-hashes --no-compile -r .engineering/headroom/requirements.lock
/absolute/private/headroom-venv/bin/python .engineering/headroom/headroom_context.py status
/absolute/private/headroom-venv/bin/python .engineering/headroom/headroom_context.py optimize --input /absolute/private/tool-output.json --store /absolute/private/headroom-store --kind tool-json
/absolute/private/headroom-venv/bin/python .engineering/headroom/headroom_context.py retrieve --store /absolute/private/headroom-store --id ORIGINAL_SHA256 --full
```

Verify the returned full original SHA before making a sensitive decision. A base
Python interpreter can also run `retrieve` without Headroom installed, using the
same vendored launcher and private store. A status/skill file is not proof of a
native Codex or Claude model-session invocation.

`--kind code` and `--kind policy` explicitly preserve the supplied bytes. Do not
relabel protected content as logs to force compression. Invalid JSON, secret-path
inputs and invalid/private-store boundaries must fail rather than becoming a
different guessed input type. Use only the payload required for the authorized
task; no full account inventory, conversation export or customer data is needed.

The launcher accepts at most 2 MiB of UTF-8 input. Payloads below 1,024 bytes pass
through; 1,024 bytes is eligible for the SDK path. This byte cutoff is separate
from the SDK's 250-token compression threshold. Tool JSON rejects duplicate keys,
nonfinite numbers, nesting deeper than 40, more than 100,000 values and nonempty
known credential fields. These bounded checks do not prove that arbitrary input
contains no secrets. System/user/developer role envelopes also pass through.

Stores require owner-only directories/files (0700/0600). Each retained original
is bounded by the input limit; no total-store quota or replicated-backup guarantee
is implemented. Retrieval returns at most 4,096 characters by default. A literal
query has 1–128 characters with no controls; it selects the first five matching
lines with two neighboring lines on each side, then applies the same character
bound. `--full` returns the verified original, up to the 2 MiB input limit.

An entry is identified by the original SHA256 and is immutable. Repeating the same
original and kind reuses its saved result, including a prior fallback. The same
original with a different kind is rejected. To test a newly reviewed runtime,
choose a distinct private store; do not delete or rewrite the previous evidence.

Inspect `status` (`optimized`, `passthrough` or `fallback`) and `reason`, the
original/output hashes, byte counts and SDK/network metadata. Exact token fields
stay null when unavailable; estimates identify their source. `context_usage` and
`billing` remain null when unmeasured. A missing SDK, short input or protected
payload is not a compression success. A caught SDK error can also return the
original with zero counters; disclose it rather than reporting zero token usage.

SDK-reported estimated message counts include fixed system/user sentinels and the
selected tool message; they are not precise bare tool-text counts. The
`protected_messages_unchanged` field is true only on an accepted SDK proof and null
on passthrough/fallback. Input passthrough is verified independently of that SDK
proof field.

`status` reports package/version/platform metadata without importing the SDK and
keeps `runtime_verified=false`. Only an actual result reporting
`network_boundary="linux-seccomp-no-ip"` establishes that boundary for its worker;
an installed optimization candidate does not. Use `status --store` for an existing
store, after optimization has created it or a prior reviewed store was selected.

## Retrieval and fidelity

The tool's retained original/manifest is separate from the SDK's transient CCR
cache. `retrieve` verifies the full original SHA256 before producing a bounded
view or `--full` content. A query is a navigation aid, not a completeness proof.
Retrieve and inspect the full verified original before security/authority,
production, destructive-data or protected-contract actions based on optimized
content. If retrieval or its digest fails, stop that action and recover the source.

Headroom's direct `CompressionStore` defaults to memory; its global
`get_compression_store()` defaults to SQLite at the workspace root. The upstream
default TTL is 1,800 seconds with entry-count eviction. Those cache semantics do
not provide durable engineering memory or a backup. Agent-mode densification
intentionally emits no CCR removal markers: an explicit original-store/retrieve
round-trip is separate from automatic model tool use. Default upstream compression
can be lossy plus retrievable; do not apply that assumption to this stricter regime.

## Recorded evidence and limits

An initial task-local SDK preflight used the earlier 122-entry public catalog
fixture: 33,743 input bytes became 9,340 output bytes. All 122 IDs survived;
losslessness and exact original retrieval passed, system/user content remained
unchanged, and the tested process denied IPv4/IPv6 socket creation. This is a
fixture result, not a compression promise for different content or later catalogs.

The BPE asset host returned HTTP 403 during preparation, so the reported token
counts were **estimated**. No native-provider token saving, provider bill, model-context
percentage or end-to-end answer-accuracy result was measured. The test's socket
denial does not establish account-wide network isolation. No paid model call ran.

Separate reference-encoder measurements may be exact for their named bundled
tokenizer artifact and bare input/output strings. They do not establish a current
provider model's chat-template token counts, context utilization or billing; keep
those results separate from the SDK's estimates and native-agent claims.

An earlier launcher candidate was also run on the same public fixture in a fresh private
store. Its output SHA256 was
`05024b707372de267dea83aa2551f921da6c27f3fd8b93e294d1d184ec4d499e`;
full retrieval matched original SHA256
`e25afcac3a1b1884d384e06d739946a897f040ab6fb667d160d0b86d94749ecf`.
One observed launcher compression took 260.97 ms; this is one sample, not a latency
percentile or a prediction of end-to-end model task speed.

| Measurement on this fixture | Original | Optimized | Reduction |
| --- | ---: | ---: | ---: |
| UTF-8 bytes | 33,743 | 9,340 | 72.32% |
| Bundled anthropic-named reference BPE | 9,928 | 4,113 | 58.57% |
| Bundled deepseek-named reference BPE | 10,116 | 3,657 | 63.85% |

The two exact reference counts used the reviewed LiteLLM-bundled tokenizer JSON
artifacts (SHA256 `c241737df24b4e7f7c9af4fdcee29a0ca903dcb288a8b753bc346a3092911767`
and `4607b3d1929c5ca263a81d7153c6d6ecdbc71c9e933c0fb2df2abf181bf6df61`)
with tokenizers 0.23.3, no special tokens, padding, truncation or chat templates.
Both decode round-tripped the exact UTF-8 strings. The SDK's own sentinel-inclusive
counts were estimated and are a separate measurement. Neither named reference is
asserted to be the current Claude/Codex tokenizer or a provider billing meter.
Strict decoded JSON matched all 122 original records. Answer/task equivalence,
actual model-context consumption, monetary savings and comparative model quality
were not measured.

A second real SDK test with a nested table triggered Headroom's lossless verifier
to revert a transformation. The launcher correctly kept the original, reported
fallback and claimed zero byte reduction. Preserve this negative case: maximum
compression is subordinate to information preservation.

The SDK was invoked through an actual Codex tool-session subprocess. This is
different from intercepting native Codex/Claude traffic, loading a project MCP
configuration or invoking a tool in an authenticated model session. Native Claude
and native MCP activation remain unverified. Official proxy, wrapper and MCP modes
exist upstream; `headroom wrap`, `mcp install`, failure learning and service setup
are outside this activation and must not modify existing owner instructions.

Local launcher/worker tests, negative retrieval tests and final reviewed Hub CI
must be recorded separately from this initial SDK preflight. Selective project
adoption uses reviewed vendoring and each project's own checks; it does not
activate Headroom automatically or make production depend on the public Hub.

References: [official source](https://github.com/headroomlabs-ai/headroom),
[SDK/compression source](https://github.com/headroomlabs-ai/headroom/blob/ce0460cfa8598dc939243dbc7aec4b2d35f4e44a/headroom/compress.py),
[CCR source](https://github.com/headroomlabs-ai/headroom/blob/ce0460cfa8598dc939243dbc7aec4b2d35f4e44a/headroom/cache/compression_store.py),
[filesystem contract](https://docs.headroomlabs.ai/docs/filesystem-contract) and
[upstream limitations](https://docs.headroomlabs.ai/docs/limitations).
