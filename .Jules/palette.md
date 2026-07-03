## 2024-05-15 - Chat Webview Forms Lack Visual Labels
**Learning:** In the Agentium extension's chat webview, custom form controls (like select and textarea) lack visual labels, requiring explicit aria-labels for screen reader accessibility, and rely on hover states that aren't triggered by keyboard navigation, necessitating explicit focus-visible styling.
**Action:** Always add descriptive `aria-label`s and explicitly style `:focus-visible` states to match existing hover states for screen reader accessibility and keyboard navigation.
