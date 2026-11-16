# Industrial Program Library — GitHub Pages + private GitHub Releases

A static, GitHub-hosted portal for browsing and downloading private industrial HMI/PLC program releases. Supports Kinco, INVT and Other manufacturers, HMI and PLC types, version numbers, upload comments, author, date, latest-only and all-versions views.

## Security and functional boundaries

- The GitHub Pages **interface is public** on standard GitHub accounts. **Do not put program files, release metadata, credentials or internal comments in the Pages repository.**
- The program repository is **private**. Access is enforced by GitHub, not by hiding interface elements.
- Each user supplies a fine-grained GitHub PAT with access only to the storage repository. The token remains in JavaScript memory, is not persisted to localStorage/cookies and is cleared on disconnect or page refresh. A token is still exposed to any malicious JavaScript served on this site; protect the Pages repository and review changes.
- The admin panel links to **GitHub's native Releases publishing UI**, rather than attempting to upload program binaries from static Pages. It is not an in-portal file upload form.
- Admin/Viewer indicators are based on GitHub's repository permissions; GitHub itself enforces write access. **A personal-account collaborator may still be able to modify the repository directly even when using a read-only token in the portal.**
- Download uses the authenticated GitHub API and may be blocked by GitHub API redirect/CORS behavior in some browsers. If so, use the supplied GitHub Release link to download in GitHub's authenticated UI.
- The portal fetches up to **1,000 releases**. It filters draft/prerelease versions and shows the latest by release publication date, not semantic version comparison.
- This project does not provide per-user download auditing, enforced approval workflows, or automatic revocation of previously downloaded files.
- Release validation occurs **after publication** and does not automatically block a malformed release from appearing. Review and correct failed checks.

## Deployment — two repositories

### A. Create the private storage repository

1. Sign in to your personal GitHub Free account **elabnpd**.
2. Create `industrial-program-storage` with visibility **Private**.
3. Copy the contents of `storage-repository-template/` into the root of that repository (including `.github/workflows/validate-release.yml`), then commit.
4. **Important:** GitHub Free personal private repositories do not provide a reliable read-only collaborator role. Invited collaborators generally have write permissions. Do **not** invite viewer-only staff to this private repository if preventing uploads/deletion is mandatory. For strict viewer-only access, use an organization with suitable permissions or a separate authenticated backend.
5. In Settings > Actions, permit GitHub Actions for the repository if needed.

### B. Create the public portal repository

1. Create `industrial-program-portal` as a **Public** repository. GitHub Pages on standard GitHub plans requires public publication for this design.
2. Copy `index.html`, `assets/`, `.github/workflows/deploy.yml`, `.nojekyll`, and this README into the repository root. **Do not copy `storage-repository-template` into the public deployment repository** if it contains internal information; the provided template is generic.
3. Commit and push to branch `main`.
4. In Settings > Pages, select **GitHub Actions** as the Build and deployment source.
5. In Actions, allow the deployment workflow to run. Open `https://elabnpd.github.io/industrial-program-portal/` once the Pages deployment succeeds.
6. Optionally configure branch protection on `main` and require reviews before portal changes.

### C. Create a GitHub token per user

1. Visit https://github.com/settings/personal-access-tokens/new while signed in.
2. Set resource owner to **elabnpd**, select **Only select repositories**, and select `industrial-program-storage`.
3. Set repository permissions to **Contents: Read-only** (Metadata is automatically read). Set a short expiration date.
4. Only accounts already authorized to access the private repository can use a token to read it. A read-only token does **not** remove the underlying write permissions of an invited collaborator.
5. Open the portal, enter owner **elabnpd**, repository **industrial-program-storage**, and token. Do not send tokens through email or chat.
6. Administrators can also use a read-only token for portal browsing, and publish through GitHub's native Releases page after signing into GitHub.

### D. Publish a program version

1. In the private storage repository, open **Releases > Draft a new release**.
2. Create a new tag such as `HPN-2W1S-KINCO-v1.2.0` (use a new unique tag per program/version).
3. Set release title to `HPN 2W+1S — Kinco HMI — v1.2.0`.
4. Paste the release notes template from the portal and fill all fields. Supported manufacturer values: `Kinco`, `INVT`, `Other`; type values: `HMI`, `PLC`.
5. Attach the program ZIP or original file and **publish**. Do not publish secrets, credentials, passwords or production site-specific keys in the packages.
6. Check **Actions > Validate program release** for a passing result. A failed check means the published release must be corrected.
7. In the portal, click Refresh. Search by program, manufacturer, type, version or comments; switch to All versions to retrieve older releases.

## Example release metadata

```text
Program-ID: HPN-2W1S-KINCO
Program-Name: HPN 2W+1S
Manufacturer: Kinco
Program-Type: HMI
Version: 1.2.0
Upload-Comments: Fixed pressure scaling and improved pump alternation.

Changes:
- Updated pressure display
- Revised fault reset logic
```

## Recommended operations

- Keep original HMI/PLC source files, compiled files and required software version information together in each ZIP.
- Include a manifest with HMI model, software version, PLC model, compatibility and checksums.
- Review changes before publishing. For stronger release gating, add a workflow that validates a draft candidate **before** an administrator publishes it.
- For seamless GitHub OAuth without PAT entry, true in-portal uploads, per-user download logs or private Pages authentication, add a secure backend/enterprise feature; static GitHub Pages alone cannot provide these securely.

## Account-specific repository links

- Portal repository: https://github.com/elabnpd/industrial-program-portal
- Private storage repository (create first): https://github.com/elabnpd/industrial-program-storage
- Portal URL after deployment: https://elabnpd.github.io/industrial-program-portal/

These URLs are planned locations; creating the ZIP does not create repositories or deploy the website.
