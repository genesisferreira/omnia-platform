# Git integration strategy — R0 (E03–E15)

**Date:** 2026-08-11  
**Feature tip (pre-R0 audit):** `fa4f6cd` on `feature/neurofrigo-knowledge-hub`  
**Strategy chosen:** **B) release branch** (controlled cut from feature line)

## Ancestry

| Ref                                | Relation to feature tip                         |
| ---------------------------------- | ----------------------------------------------- |
| `origin/develop` (`dc069e9`)       | **ancestor** (feature is 173 commits ahead)     |
| `origin/main` (`454d21e`)          | **ancestor** (feature further ahead)            |
| `origin/release/2.3.0` (`e45c119`) | **ancestor** (feature ~126 commits ahead)       |
| Landing `release/landing-v1.0`     | **isolated worktree** — do not merge into AI RC |

## Recommendation

1. Harden + green CI on feature line (R0).
2. Cut `release/omnia-platform-ai-v3` from the hardened tip (no landing, no untracked `/tmp` scripts).
3. Open PR → `develop` (integration trunk), then promote via existing release process to production **after human approval**.
4. Do **not** merge blindly to `main` first (`main` is behind `develop`).

## Why not A/C alone

- **A merge direto feature→main:** too risky; `main` stale.
- **C cherry-pick organizado:** 100+ commits; high conflict cost; history loss.

## Exclusions from RC

- `landing-lancamento/**` (separate product)
- Untracked `scripts/deploy/_e*` leftovers
- `.env*`, backups, SQL dumps

## Expected conflicts

Low vs `develop` (fast-forward-ish historically). Highest risk areas if develop moved: CMS partners, SMTP — reconcile at PR time.
