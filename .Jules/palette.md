## 2026-05-31 - Webview Forms Accessibility & Async Button States
**Learning:** In VS Code Webviews, native inputs (`<select>`, `<textarea>`, `<button>`) often lack screen-reader context if not explicitly labeled with `aria-label`. Additionally, disabling a button during an async operation isn't enough for screen readers; updating the text to 'Sending...' and setting `aria-busy="true"` drastically improves the experience.
**Action:** Always verify that core interactive elements in Webviews have explicit `aria-label`s and that async buttons provide textual + `aria-busy` feedback.
