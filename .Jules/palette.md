## 2024-03-24 - VS Code Webview Accessibility
**Learning:** VS Code webviews act as separate documents embedded within the editor. By default, standard HTML elements inside webviews do not always inherit the editor's focus ring styles or provide sufficient context to screen readers, leading to poor keyboard navigation and accessibility.
**Action:** Always explicitly define `:focus-visible` styles using theme colors (like `var(--accent)`) and provide comprehensive `aria-label`s for interactive elements inside VS Code webviews to ensure they are accessible.
