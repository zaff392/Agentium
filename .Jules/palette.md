## 2024-05-18 - WebView Chat Accessibility
**Learning:** For chat interfaces built in WebViews, dynamically added content isn't read by screen readers unless the container has `role="log"` and `aria-live="polite"`. Also, custom styled inputs like `<select>` and `<textarea>` need explicit `aria-label`s, and interactable elements need clear `:focus-visible` styles for keyboard navigation.
**Action:** Always add `role="log"` and `aria-live="polite"` to dynamically updating chat containers, and ensure all inputs have `aria-label`s and clear focus states.
