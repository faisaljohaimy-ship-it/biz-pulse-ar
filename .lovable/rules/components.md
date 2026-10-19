# Components

Component catalog for **AI Command Center**. Import all components from `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f`.

### NxAnimatedKpi

```ts
import { NxAnimatedKpi } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop             | Type   | Default |
| ---------------- | ------ | ------- |
| `value`          | number | `—`     |
| `fractionDigits` | number | `0`     |

### NxButton

```ts
import { NxButton } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop      | Type                                                                                             | Default     |
| --------- | ------------------------------------------------------------------------------------------------ | ----------- |
| `variant` | primary · secondary · ghost · glass · outline · danger · warning · success · runtime · executive | `secondary` |
| `size`    | sm · md · lg · xl                                                                                | `md`        |
| `icon`    | true · false                                                                                     | `false`     |
| `loading` | boolean                                                                                          | `false`     |

### NxDelta

```ts
import { NxDelta } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop             | Type      | Default |
| ---------------- | --------- | ------- |
| `value`          | number    | `—`     |
| `goodDirection`  | up · down | `—`     |
| `noiseThreshold` | number    | `0`     |
| `unit`           | string    | `—`     |

### NxEmptyState

```ts
import { NxEmptyState } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop              | Type                               | Default      |
| ----------------- | ---------------------------------- | ------------ |
| `kind`            | true-empty · filtered · no-results | `true-empty` |
| `icon`            | any                                | `—`          |
| `title`           | string                             | `—`          |
| `description`     | string                             | `—`          |
| `layer`           | any                                | `—`          |
| `action`          | function                           | `—`          |
| `secondaryAction` | function                           | `—`          |

### NxErrorState

```ts
import { NxErrorState } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop          | Type                  | Default          |
| ------------- | --------------------- | ---------------- |
| `severity`    | recoverable · blocked | `recoverable`    |
| `title`       | string                | `—`              |
| `description` | string                | `—`              |
| `onRetry`     | function              | `—`              |
| `retryLabel`  | string                | `إعادة المحاولة` |
| `traceId`     | string                | `—`              |

### NxEventTicker

```ts
import { NxEventTicker } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop     | Type | Default |
| -------- | ---- | ------- |
| `events` | any  | `—`     |

### NxGlassCard

```ts
import { NxGlassCard } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop          | Type    | Default |
| ------------- | ------- | ------- |
| `interactive` | boolean | `false` |

### NxKpiCard

```ts
import { NxKpiCard } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop         | Type    | Default |
| ------------ | ------- | ------- |
| `label`      | string  | `—`     |
| `value`      | any     | `—`     |
| `unit`       | string  | `—`     |
| `delta`      | any     | `—`     |
| `updatedAt`  | string  | `—`     |
| `simulation` | boolean | `—`     |

### NxKpiNumber

```ts
import { NxKpiNumber } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop    | Type   | Default |
| ------- | ------ | ------- |
| `value` | any    | `—`     |
| `unit`  | string | `—`     |
| `size`  | any    | `md`    |

### NxLayerStack

```ts
import { NxLayerStack } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop            | Type     | Default |
| --------------- | -------- | ------- |
| `activeLayer`   | any      | `—`     |
| `onSelectLayer` | function | `—`     |

### NxPanel

```ts
import { NxPanel } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop         | Type                                                   | Default   |
| ------------ | ------------------------------------------------------ | --------- |
| `title`      | string                                                 | `—`       |
| `layer`      | runtime · shell · agent · knowledge · twin · analytics | `—`       |
| `density`    | boardroom · command · operations                       | `command` |
| `headerSlot` | any                                                    | `—`       |
| `footer`     | any                                                    | `—`       |

### NxPipelineFlow

```ts
import { NxPipelineFlow } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop              | Type     | Default |
| ----------------- | -------- | ------- |
| `activeStage`     | any      | `—`     |
| `approvalPending` | boolean  | `false` |
| `onSelectStage`   | function | `—`     |

### NxProgress

```ts
import { NxProgress } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop    | Type   | Default |
| ------- | ------ | ------- |
| `value` | number | `—`     |
| `label` | string | `—`     |

### NxRegionPulse

```ts
import { NxRegionPulse } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop       | Type    | Default |
| ---------- | ------- | ------- |
| `regionId` | any     | `—`     |
| `live`     | boolean | `false` |
| `size`     | number  | `40`    |

### NxSadeedPresence

```ts
import { NxSadeedPresence } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop        | Type                                                                                                      | Default    |
| ----------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| `state`     | idle · listening · thinking · retrieving · reasoning · speaking · executing · completed · error · offline | `idle`     |
| `mode`      | advisory · supervised · gated                                                                             | `advisory` |
| `size`      | sm · md · lg                                                                                              | `md`       |
| `showLabel` | boolean                                                                                                   | `true`     |

### NxSkeleton

```ts
import { NxSkeleton } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop  | Type                  | Default |
| ----- | --------------------- | ------- |
| `bar` | text · title · number | `text`  |

### NxSparkline

```ts
import { NxSparkline } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop     | Type   | Default |
| -------- | ------ | ------- |
| `points` | any    | `—`     |
| `width`  | number | `120`   |
| `height` | number | `32`    |
| `label`  | string | `—`     |

### NxSpinner

```ts
import { NxSpinner } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop    | Type   | Default |
| ------- | ------ | ------- |
| `size`  | any    | `16`    |
| `label` | string | `—`     |

### NxStatusIndicator

```ts
import { NxStatusIndicator } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop     | Type                                | Default |
| -------- | ----------------------------------- | ------- |
| `status` | success · warning · critical · info | `—`     |
| `label`  | string                              | `—`     |
| `live`   | boolean                             | `false` |

### NxTwinLink

```ts
import { NxTwinLink } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop     | Type    | Default |
| -------- | ------- | ------- |
| `from`   | object  | `—`     |
| `to`     | object  | `—`     |
| `active` | boolean | `false` |
| `width`  | number  | `—`     |
| `height` | number  | `—`     |

### NxTwinNode

```ts
import { NxTwinNode } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop     | Type   | Default |
| -------- | ------ | ------- |
| `name`   | string | `—`     |
| `status` | any    | `—`     |

### NxVoiceButton

```ts
import { NxVoiceButton } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop    | Type                         | Default |
| ------- | ---------------------------- | ------- |
| `state` | idle · listening · recording | `idle`  |

### NxWaveform

```ts
import { NxWaveform } from "@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f";
```

**Props:**

| Prop     | Type   | Default |
| -------- | ------ | ------- |
| `levels` | any    | `—`     |
| `height` | number | `24`    |
