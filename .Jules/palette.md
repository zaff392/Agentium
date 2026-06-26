## 2024-06-26 - Webview Form Accessibility
**Learning:** Custom form controls (like `<select>`, `<textarea>`, and buttons) within VS Code webviews lack default visual accessibility features and semantic labeling compared to native inputs.
**Action:** Always add descriptive `aria-label` attributes to custom webview inputs and explicitly style `:focus-visible` pseudo-classes to match existing `:hover` states, ensuring screen reader compatibility and clear visual indicators during keyboard navigation.
