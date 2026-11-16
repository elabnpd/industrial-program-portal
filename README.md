# Industrial Program Portal — elabnpd

## Repositories

1. **Public** `elabnpd/industrial-program-portal`: upload `index.html`, `assets/`, `.github/workflows/deploy.yml` and this README. Enable Settings → Pages → Source: GitHub Actions.
2. **Private** `elabnpd/industrial-program-storage`: upload the **contents** of `storage-workflow/` (including `.github/workflows/publish-program.yml` and `scripts/publish.py`). Ensure the default branch is `main`. In Settings → Actions → General, allow workflow read and write permissions (or configure appropriate token permissions).

## Admin upload

Create a new fine-grained personal access token scoped **only** to the private storage repository with **Contents: Read and write**. In the portal, tick Admin publishing mode and connect with that token. Choose Series, Model, Program Type, Version, comments and archive. Upload limit: 10 MiB. The portal stages the file and manifest in a single Git commit; the private repository's GitHub Actions workflow validates the archive and creates a Release.

**Important:** GitHub Pages is public. The admin token exists in the browser's JavaScript memory and may be exposed to malicious browser extensions, XSS, or an untrusted computer. Do not use shared computers. Never paste tokens in chat, logs or public source. For stronger security or large uploads, use a real authenticated backend instead of this static-only design. Revoking previously exposed tokens is essential.

## Viewer access

A viewer token requires Contents: Read-only. On a **personal GitHub Free** private repository, collaborators generally have write access, so viewer-only GitHub permissions cannot be guaranteed. Do not share your admin token. Consider an organization repository with granular roles or a secure backend for production team access.

## Archive limitations

Accepted extensions: `.zip`, `.rar`, `.7z`, `.tar`, `.tar.gz`, `.tgz`, `.gz`, `.bz2`, `.xz`. The publishing workflow checks file magic bytes, size and metadata, but does **not** perform malware scanning or fully extract/test every archive. Archives can contain executable content; verify trusted sources.

## Release tags

Examples: `M-1W1S-HMI-v1.0.0`, `M-1W1S-PLC-v1.1.0`, `5M-2W1S-HMI-v2.0.0`.

## Known limits

- Browser API upload has a 10 MiB limit; GitHub's API may impose stricter practical constraints.
- Releases are shown from the first 100 returned by the GitHub API; pagination is not implemented.
- GitHub Pages deployment requires Pages to be enabled before `configure-pages` runs.
- The browser asset download endpoint may have CORS limitations; if a download fails, use the authenticated GitHub release page.
- Git commits preserve staged archive history even after workflow cleanup; this is private storage, not secure erasure. Storage grows with each upload.
- Concurrent uploads can produce a ref-update conflict; retry after the previous upload finishes.
- The upload status reports staging, not publication; check the private repository's Actions tab to confirm release creation.
