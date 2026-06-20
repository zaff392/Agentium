## 2024-05-18 - Screen Reader Compatibility for Webview Chat
**Learning:** VS Code webviews require explicit `role="log"` and `aria-live="polite"` regions for chat interfaces to ensure that screen readers automatically announce dynamically injected incoming messages (e.g., from the assistant or the user). Simply appending elements via JavaScript is not enough for accessibility tools to pick up the changes.
**Action:** Always add `role="log"` and `aria-live` attributes to the container element of any chat UI or similar dynamic log system when building interfaces within VS Code webviews.
