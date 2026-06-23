## 2024-06-23 - Form Control Accessibility in Agentium Chat
**Learning:** Custom form controls (select, textarea) in the chat webview lack visual labels and explicit focus states for keyboard navigation, leading to poor screen reader and keyboard accessibility.
**Action:** Always add descriptive `aria-label`s to visually label-less inputs and explicitly style `:focus-visible` states to match existing hover/focus styles.
