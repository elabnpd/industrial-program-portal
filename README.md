# Industrial Program Portal — GitHub-only edition

## What works and what is limited

- Static portal on GitHub Pages; private GitHub Releases as the archive library.
- A GitHub fine-grained PAT must belong to a GitHub account authorized to access the private repository. Viewer: Contents read; admin: Contents read/write.
- PATs are entered into the browser, kept in memory only. **Never share a PAT**, and revoke any previously exposed token.
- For files <= 10 MiB, the existing Git data API staging + GitHub Actions publishing workflow is retained. This path is tested only syntactically; it needs a live repository test.
- For files > 10 MiB and <= **100,000,000 bytes**, the portal **attempts** direct browser-to-GitHub Release upload, creating a draft first. GitHub may block this with CORS. If it fails, the draft remains and the portal displays a GitHub link for manual upload while signed in. It does **not** silently claim upload success.
- For private downloads, the browser attempts authenticated GitHub API download. GitHub redirects/CORS may block it. In that case the only GitHub-only fallback is to download from the release page while signed in to an authorized GitHub account. **No GitHub-only static-page solution can guarantee token-only private downloads for users without GitHub access.**
- Admin mode in the UI is not role-based security: actual permission comes from the token. Read-only tokens cannot upload.
- GitHub Release files are not committed into repository history on the direct upload path.

## Deploy

1. Create/verify private repo `elabnpd/industrial-program-storage` with a `main` branch and at least one commit.
2. Copy `storage-workflow/.github/workflows/publish-program.yml` into the private repo as `.github/workflows/publish-program.yml` and `storage-workflow/scripts/publish.py` as `scripts/publish.py`.
3. In private repo Settings > Actions > General, allow Actions and set workflow permissions to **Read and write**.
4. Copy **index.html**, **assets/**, and **.github/workflows/deploy.yml** from this ZIP to public repo `elabnpd/industrial-program-portal`. Do not copy `storage-workflow/` to the public repo.
5. Public repo Settings > Pages > Source: **GitHub Actions**. Wait for deployment at https://elabnpd.github.io/industrial-program-portal/.
6. Revoke any exposed PAT. Create new fine-grained PATs restricted to private storage repo. Viewer Contents read; admin Contents read/write. Never commit a PAT.
7. Test with a small ZIP first. Confirm release appears in private repo Releases and portal after Refresh.
8. Test a >10 MiB archive. If browser upload is blocked, use the manual release link. For a draft, attach the archive and publish the draft on GitHub.
9. Test private download. If `Failed to fetch` persists, use release page fallback; meeting token-only download without GitHub sign-in requires an authenticated intermediary (e.g. a Worker or server), which is intentionally excluded here.

## Tag naming

`I-1W1S-PLC-v1.0.1` for I / 1W+1S / PLC / version 1.0.1. Each version must have a unique tag. Attach ZIP, RAR, 7Z, TAR, TAR.GZ, TGZ etc.

## Known technical constraints

The upload API's `uploads.github.com` host is separate from `api.github.com`, and cross-origin browser requests may be denied. There is no client-side workaround for a server's CORS policy. GitHub Pages cannot keep a shared secret. Do not promise reliable 100 MB upload or private token-only download without a server-side component.
