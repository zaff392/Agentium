## 2024-07-08 - Added Custom ARIA labels and Focus States to WebView form elements
**Learning:** Custom form controls in VS Code webviews lack default accessible styles and labels unless explicitly defined. `:focus-visible` needs to be consistently styled to match the hover/focus states to ensure proper accessibility and a great experience for keyboard users.
**Action:** Always add descriptive `aria-label`s (especially for `select` and `textarea` components) and explicitly style `:focus-visible` to match interaction patterns whenever working in VS Code WebViews.
