## 2024-04-14 - Webview Form Accessibility
**Learning:** Custom VS Code webviews often lack native accessibility attributes like `aria-label` for form elements and clear focus indicators (`:focus-visible`), which are crucial for screen reader users and keyboard navigation.
**Action:** Always verify `aria-label` on bare `<select>` and `<textarea>` elements, and explicitly style `:focus-visible` to match the application's accent color.
