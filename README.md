# Industrial Program Portal for elabnpd

## Public website repository
Upload `index.html`, `assets/`, `.github/workflows/deploy.yml`, and this README to the PUBLIC repository `elabnpd/industrial-program-portal`. Do NOT upload `storage-template/` into the public repository. Set Settings > Pages > Source: GitHub Actions. The site will deploy to https://elabnpd.github.io/industrial-program-portal/.

## Private storage repository
Create `elabnpd/industrial-program-storage` as PRIVATE. Copy the CONTENTS of `storage-template/` to that repository, preserving `.github/workflows/validate-release.yml`.

## Publishing
Use https://github.com/elabnpd/industrial-program-storage/releases/new . Choose a unique tag like `M-1W1S-HMI-v1.0.0`, enter upload comments in the description, attach exactly one archive (.zip/.rar/.7z/.tar/.tar.gz/.tgz), and publish. The site will group releases by Series > Model > Program Type, showing independent version histories. The GitHub Actions release validation runs after publication; if it fails, the release is not automatically withdrawn. Correct or delete invalid releases manually.

## Viewing
Create a fine-grained PAT with `Contents: Read` for the private storage repo, paste it into the portal, and click Connect. Token remains only in JavaScript memory, not localStorage. The public page itself is not private. Never share a PAT or place one in the repository. Private repository access must be granted separately. On GitHub Free personal private repositories, collaborators typically have write access; this setup does not guarantee viewer-only roles. For secure read-only team access, consider an organization with appropriate roles or a separate authenticated backend.

## Limitations
- Admin upload occurs on GitHub Releases, not directly in the portal.
- Browser-based private asset download depends on GitHub API response and browser support; use the GitHub release page fallback.
- No per-user download audit log.
- GitHub release asset size limits apply.
- Avoid exposing credentials in browser screenshots, extensions, or shared machines.
