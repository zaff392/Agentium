## 2025-01-24 - Webview Chat Accessibility & Focus Management
**Learning:** Form elements in custom UI webviews (like chat interfaces) often lack semantic `<label>` tags, rendering them inaccessible to screen readers without explicit `aria-label`s. Furthermore, users lose their keyboard flow if clicking the "Send" button shifts focus away from the chat input.
**Action:** Always provide `aria-label` attributes for label-less form inputs and programmatically return focus to the primary text input after message submission to maintain interaction flow.
