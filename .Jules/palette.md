## 2024-06-03 - Webview Accessibility
**Learning:** Dynamic VS Code webview content, like dynamically injected messaging elements and interactive action buttons for code blocks, can heavily impair screen reader users if ARIA live regions and standard ARIA attributes are ignored.
**Action:** Always inject `aria-live` and `aria-relevant` properties to dynamic message containers to ensure accessibility. Add proper explicit ARIA labels/titles to all dynamically generated interactive icons/buttons.
