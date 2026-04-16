# Characters Seed Directory

This directory centralizes role management:

- presets/: built-in preset character asset folders
- added/: user-added character asset folders cached locally

Preset folder layout (recommended):

- seeds/characters/presets/<roleId>/profile.json
- seeds/characters/presets/<roleId>/source.yaml
- seeds/characters/presets/<roleId>/portrait.png (optional)

Added folder layout (recommended):

- seeds/characters/added/<roleId>/profile.json
- seeds/characters/added/<roleId>/source.yaml
- seeds/characters/added/<roleId>/portrait.png (optional, reserved for future image assets)

Runtime lookup uses profile.json as the primary source. source.yaml is kept as raw archive data.

Backward compatibility:

- Legacy flat files in added/ (e.g. <roleId>.json, <roleId>.yaml) are still readable.
- New remote cache writes use the per-role folder layout.

Current preset source consumed by frontend:
- seeds/characters/presets/5738g/profile.json
