# .github

GitHub workflows and setup for this repo.

## Workflows

- **workflows/ci.yml** — Runs `npm test` on push and pull requests to `main` and `dev`. Use with branch protection so `main` only accepts PRs that pass.

## Branch protection (GitHub Settings)

To enforce **PR-only merges to main** and require CI to pass:

1. Repo → **Settings** → **Branches** → **Add branch protection rule** (or edit rule for `main`).
2. **Branch name pattern:** `main`.
3. Enable:
   - **Require a pull request before merging** (e.g. 1 approval if you want, or leave at 0 for just PR required).
   - **Require status checks to pass before merging** → select **test** (from the `ci.yml` workflow).
4. Save.

After this, direct pushes to `main` are blocked; changes must go via a PR, and the CI workflow must succeed.
