# Private Industrial Program Storage

This repository must be PRIVATE. Publish HMI/PLC program archives as GitHub Releases.

Release tag convention: `<SERIES>-<MODEL_NO_PLUS>-<TYPE>-v<SEMVER>`

Examples:
- `M-1W1S-HMI-v1.0.0`
- `M-1W1S-PLC-v1.2.0`
- `5M-2W1S-HMI-v2.0.0`
- `Ir-3W1S-PLC-v1.0.0`

Use the release description for upload comments. Attach exactly one `.zip`, `.rar`, `.7z`, `.tar`, `.tar.gz`, or `.tgz` archive. GitHub records the author and publish date. Do not upload archives into the public portal repository.

Note: The validation workflow checks extension and basic signatures for ZIP, RAR, 7Z, and GZIP; TAR is checked for its ustar marker when present. It is not a malware scanner or a comprehensive archive integrity check.
