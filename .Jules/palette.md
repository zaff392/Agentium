## 2024-05-15 - Missing Accessibility Labels in Webviews
**Learning:** Webviews generated from string templates often lack default accessibility labels, making forms and action buttons difficult for screen reader users to interact with.
**Action:** Add explicit `aria-label` attributes to interactive elements like `<select>`, `<textarea>`, and `<button>` within webview HTML templates.
