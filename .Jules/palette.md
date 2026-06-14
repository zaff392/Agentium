## 2026-06-14 - Webview Form Accessibility
**Learning:** In VS Code webviews, basic input elements (select, textarea, buttons) often lack screen reader context and keyboard focus styling out of the box because they don't inherit OS/Browser defaults visually in the same way. The custom styling strips standard outline behaviors.
**Action:** Always add explicit `aria-label` attributes to form elements without visible associated labels, and explicitly add `:focus-visible` styling using the extension's theme colors (`var(--accent)`) to ensure keyboard navigability is visually apparent.
