# Industrial Program Storage (PRIVATE)

This repository must remain **private**. Store HMI/PLC program ZIP packages as GitHub Release assets, not Git commits. Use tags in the format `PROGRAM-ID-vMAJOR.MINOR.PATCH`.

## Release example

Tag: `HPN-2W1S-KINCO-v1.2.0`

Release title: `HPN 2W+1S — Kinco HMI — v1.2.0`

Release notes:

```text
Program-ID: HPN-2W1S-KINCO
Program-Name: HPN 2W+1S
Manufacturer: Kinco
Program-Type: HMI
Version: 1.2.0
Upload-Comments: Fixed pressure scaling and pump alternation.

Changes:
- Updated pressure screen
- Improved pump sequence
```

Attach `HPN-2W1S-KINCO-v1.2.0.zip` to the release before publishing. Publishing triggers the validation workflow. A failed validation check does **not** automatically unpublish the release: admins must correct it promptly.

## Permissions

- Administrators: organization/repository Write or Maintain (and a designated owner with Admin).
- Viewers: repository Read.
- Require 2FA in the GitHub organization where available.
- Use GitHub organization teams, not shared credentials.
- Restrict who can publish releases using organizational controls and repository rules where supported.
