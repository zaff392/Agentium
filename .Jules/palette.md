## 2024-06-24 - Missing ARIA Labels on Extension Webview Forms
**Learning:** In the Agentium extension's chat webview, custom form controls (like select and textarea) lack visual labels.
**Action:** Always add descriptive `aria-label`s and explicitly style `:focus-visible` states to match existing hover states for screen reader accessibility and keyboard navigation.
