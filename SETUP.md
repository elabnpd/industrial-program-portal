# Setup for elabnpd

1. Upload only the contents of this folder into the **public** `elabnpd/industrial-program-portal` repository, preserving `.github/workflows/deploy.yml`.
2. In Settings > Pages select **GitHub Actions**. Run the deployment workflow. The site is public; never put private program metadata or tokens in its source.
3. Create **private** repository `elabnpd/industrial-program-storage` and publish program archives as GitHub Releases.
4. Example release tag: `M-1W1S-HMI-v1.0.0`; release notes are the upload comments. Attach an archive such as `.zip`, `.rar`, `.7z`, `.tar`, `.tar.gz` or `.tgz`. A separate tag is required for every series/model/type/version.
5. For owner testing, generate a fine-grained token with resource owner `elabnpd`, repository access **only** `industrial-program-storage`, and Contents: Read-only. Paste it into the site. Do not share it or commit it.
6. If GitHub API returns 404, verify the repository exists and the token can access it. A 404 can be an authorization failure for private repos.

## Security limitations
This is a static GitHub Pages frontend. It is **not** a fully private authenticated team portal. On a personal GitHub Free private repository, collaborators cannot be restricted to read-only repository permissions. A private repo token pasted into a browser is exposed to that browser and extensions. The download API may return metadata or be blocked by CORS; use the GitHub release page as a fallback. For strict viewer-only team access, use an organization with read-only roles or a separate authenticated backend.

## Deployment troubleshooting
`Get Pages site failed` means Pages was not enabled/configured or the workflow lacks permission. Go to Settings > Pages and select GitHub Actions. If necessary rerun workflow after enabling.
