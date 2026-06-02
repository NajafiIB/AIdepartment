# Material 3 UI Structure

The Command Center uses a local, buildless React shell with Material 3 tokens and a progressive Material Web runtime.

## Sources

- Material 3 styles: https://m3.material.io/styles
- Material 3 web guidance: https://m3.material.io/develop/web
- Material Web repository: https://github.com/material-components/material-web
- Material Web quick start: https://github.com/material-components/material-web/blob/main/docs/quick-start.md
- Material Web button docs: https://github.com/material-components/material-web/blob/main/docs/components/button.md

## Runtime Layers

1. `m3-tokens.css`
   - Owns `--md-sys-*` color, typography, shape, elevation, and component tokens.
   - Provides the single design source of truth for local fallback components and official Material Web custom elements.

2. `material-web-loader.js`
   - Uses the official buildless import-map pattern for `@material/web`.
   - Loads `@material/web/all.js` and the Material typescale stylesheet when the browser has network access.
   - Adds `html.material-web-ready` and dispatches `material-web-ready`.
   - Falls back silently to local Material 3 primitives when the CDN is unavailable.

3. `react-app.js`
   - Keeps the existing local backend API unchanged.
   - Uses source-level React primitives for data-heavy layouts.
   - Upgrades the shared `Button` primitive to Material Web `md-filled-button`, `md-filled-tonal-button`, `md-outlined-button`, and `md-text-button` after Material Web is ready.

4. `styles.css`
   - Maps the existing UI to Material 3 roles.
   - Keeps cards at the command-center standard radius while using M3 surface, state, and type roles.

## Component Mapping

| Local primitive | Material 3 role | Material Web target |
| --- | --- | --- |
| `Button` default | Filled button | `md-filled-button` |
| `Button` secondary | Filled tonal button | `md-filled-tonal-button` |
| `Button` outline | Outlined button | `md-outlined-button` |
| `Button` ghost | Text button | `md-text-button` |
| `Input`, `Select`, `Textarea` | Outlined text field surface | `md-outlined-text-field` later, when React value binding is wrapped safely |
| `Badge` | Assist/status chip | `md-assist-chip` later |
| `Card` | Surface container card | Local surface until a stable Material card web component exists |

## Rules For Future UI Work

- Add new colors only through `m3-tokens.css`.
- New interactive controls should start as local React primitives mapped to Material 3 roles.
- Use official Material Web custom elements only through shared wrappers, not directly across feature pages.
- Keep data pages dense and scannable: Material 3 surfaces, clear hierarchy, and action-specific controls.
- Do not create a separate UI framework or build pipeline unless the Command Center is intentionally migrated to a packaged desktop app.
