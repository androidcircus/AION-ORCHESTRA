---
name: GitHub PAT push
description: Authentication behavior when pushing this project to GitHub with its configured personal access token.
---

For Git transport, use the configured personal access token through an ephemeral HTTP Basic `extraheader`; do not put the token in the remote URL or print it.

**Why:** The GitHub API accepted Bearer authentication while the Git endpoint rejected the same form, so API reachability alone does not prove Git push authentication will work.

**How to apply:** Keep the repository remote as a clean HTTPS URL and pass the token only to the individual fetch or push command through a non-persisted authentication header.