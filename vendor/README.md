# Vendored SheetJS CE

`xlsx-0.20.3.tgz` is the unmodified SheetJS CE 0.20.3 release from:
https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz

SHA-256: `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8`

Retrieved 2026-10-29. The archive includes the upstream Apache-2.0 LICENSE.
Installation is pinned to this local archive in package.json and package-lock.json;
no runtime CDN is used. Upstream recommends vendoring:
https://docs.sheetjs.com/docs/getting-started/installation/nodejs/

This supersedes the outdated npm registry release 0.18.5 and includes fixes for
CVE-2023-30533 (>=0.19.3) and CVE-2024-22363 (>=0.20.2).
