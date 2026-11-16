# Industrial Program Portal — elabnpd

## Two repositories

**Public** `elabnpd/industrial-program-portal`: copy `index.html`, `assets/`, `.github/workflows/deploy.yml` here.

**Private** `elabnpd/industrial-program-storage`: copy the CONTENTS of `storage-workflow/` here, specifically `.github/workflows/publish.yml` and `scripts/publish.py`. Do not copy `storage-workflow` as a nested folder.

## Setup

1. On the public repository, Settings > Pages > Source: GitHub Actions. Push to `main`, and check Actions.
2. On the private repository, Settings > Actions > General > Workflow permissions: Read and write permissions.
3. Create a NEW fine-grained token for the private storage repository only. For admin uploads: Contents Read and write; for browsing: Contents Read-only. Never paste a token into chat or source code. Revoke any previously exposed token.
4. Open the Pages site. Select Admin mode, enter token, connect, and upload a small archive.
5. Watch the private repository's `Publish Staged Program` action. When it succeeds, refresh releases in the portal.

## Upload conventions

Series `M`, `5M`, `I`, `Ir`, `MMD`; Model `1W+1S`, `2W+1S`, etc.; Program Type `HMI` or `PLC`; Version `1.0.0`; comments required.

Release tag example: `M-1W1S-HMI-v1.0.0`. Each upload accepts one `.zip`, `.rar`, `.7z`, `.tar`, `.tar.gz`, `.tgz`, `.gz`, `.bz2`, or `.xz` file, maximum 10 MiB.

## Important limitations

The public Pages frontend is not private. The GitHub token is held in JavaScript memory, not persisted, but browser extensions or compromised client devices can access it. GitHub Free personal private repositories do not provide true viewer-only collaborator roles. Do not distribute your personal token. Publishing via the browser is a prototype and is not suitable for high-security or large industrial archives. The staging commit temporarily stores the archive in Git history; deleting the staging path does NOT remove it from Git history. GitHub Releases are also retained. Avoid confidential material unless company policy approves this architecture.

The publishing action validates archive signatures, not full malware scanning or exhaustive archive integrity. No real-time per-user download audit is provided.
