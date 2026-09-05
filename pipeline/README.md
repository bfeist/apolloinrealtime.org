# Preserved legacy pipeline processes

This directory contains the Python processes recovered from every Apollo 11,
13, and 17 legacy branch tip. Original relative paths are retained beneath each
mission. Non-Python process support such as the Apollo 11/13 templates, the
Apollo 13 shell helper, and its environment template is preserved alongside the
Python files.

The latest pre-abandonment `master` version is the canonical copy. A file is
present under `legacy-variants/<branch>/` only when that branch-tip version has
different content or does not exist in `master`. `SOURCE-MANIFEST.tsv` records
the exact source commit, original path, Git blob, destination, and import status
for all 179 preserved files, excluding this README and the manifest itself.

These are archival processes, not a supported or unified pipeline. Dependencies
are not installed, paths and imports have not been rewritten, and the programs
have not been run. This intentionally leaves existing breakage in place for a
later pipeline-rebuild task.

Seven canonical scripts contained embedded ADS, Hugging Face, or Flickr
credentials. Across canonical copies and retained branch variants, 13 file
occurrences were replaced with the literal `REDACTED_LEGACY_CREDENTIAL`. No
original credential value is stored in this checkout. This is the only intended
source-content change; affected rows are marked `credential-redacted` in the
manifest.
