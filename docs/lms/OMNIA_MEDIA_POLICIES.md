# Omnia Media Policies

Políticas resolvidas por `MediaPolicyResolver` com precedência material > curso > global (D008).

## Capacidades

| Campo | Default corporativo |
|-------|---------------------|
| `canView` | true (salvo force deny) |
| `canDownload` | false (`downloadsAllowed` LmsSettings) |
| `canPrint` | false |
| `canShare` | false |

## Decisões

Toda decisão é **imutável** (`Object.freeze`) e inclui:

- `granted`, `capabilities`, `expiresAt`
- `reason` (`GRANTED_CONTROLLED_MODE` | `DENIED_*`)
- `origin`, `correlationId`, `policySource`
- `watermarkRequired`, `controlledMode: true`

## Purpose

`view` | `preview` | `download` | `print` | `share` — purpose incompatível com capability → deny.
