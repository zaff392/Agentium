## 2026-06-01 - [Webview Form Accessibility Improvements]
**Learning:** Interactive elements in VS Code webviews (like select, textarea, and buttons) lack built-in accessibility semantics without explicit ARIA labels. Adding `title` attributes also acts as helpful tooltips for keyboard shortcut discoverability.
**Action:** Always include `aria-label` for form inputs/buttons and `title` for buttons with keyboard shortcuts in webview UI components.
