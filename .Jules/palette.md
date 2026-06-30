## 2024-05-18 - Adding `aria-label`s to custom form controls in VS Code extension webviews
**Learning:** In the Agentium extension's chat webview, custom form controls (like select and textarea) lack visual labels. They require descriptive `aria-label`s and explicitly styled `:focus-visible` states to match existing hover states for screen reader accessibility and keyboard navigation.
**Action:** Always add `aria-label` attributes to icon-only buttons and unlabelled inputs in webview HTML templates, and ensure the CSS includes `:focus-visible` styles.
