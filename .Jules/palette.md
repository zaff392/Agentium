## 2024-05-14 - Webview Form Controls Accessibility
**Learning:** The chat webview in VS Code extensions uses custom form elements (select, textarea) that lack visual labels to save space, but this pattern breaks screen reader accessibility and keyboard navigation when `aria-label` and focus-visible states are missing.
**Action:** Always add descriptive `aria-label`s to form controls that use placeholder text instead of visual `<label>`s, and explicitly style `:focus-visible` to match existing hover states for keyboard users.
