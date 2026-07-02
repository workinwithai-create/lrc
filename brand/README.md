# @workinwithai/brand

Shared brand for the WorkinWithAI family. One look, every app.

## Use it in an app (Next.js)

1. Copy this whole folder into the app as `brand/` (see SYNC.md).
2. Import the tokens once, in `app/layout.tsx`: `import '../brand/brand.css';`
3. Add the preset to `tailwind.config`: `presets: [require('./brand/tailwind.preset.js')]`
4. Load the fonts: `import { fontClasses } from '../brand/fonts';` then `<body className={fontClasses}>`
5. Drop in the shared chrome: `<WWANav currentApp="LRC Forge" />` at the top, `<WWAFooter />` at the bottom.

Static sites (no React): link `brand.css` and copy the nav/footer markup — the `.wwa-*` classes carry all the styling.

Tokens and fonts are final. Don't retune colors per app.
