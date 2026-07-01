## 2024-07-01 - Webview Form Accessibility
**Learning:** In the Agentium extension webview, custom form controls (like `<select>` and `<textarea>`) lack implicit labels and visible focus rings by default. This makes keyboard navigation confusing and screen readers ineffective.
**Action:** Always add descriptive `aria-label`s to form controls in webviews, and explicitly map `:focus-visible` styles to match `:hover` or `:focus` states for reliable keyboard accessibility.
