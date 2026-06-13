## 2024-06-13 - Missing ARIA Labels in Webview Templates
**Learning:** The VS Code Webview templates for Agentium dynamically inject UI components (like code copy/insert buttons and inputs) as raw HTML strings without ARIA labels, causing screen readers to fail at identifying interactive code actions and chat inputs.
**Action:** Always ensure string-templated HTML in VS Code extensions includes explicit `aria-label` attributes for inputs and icon-only or dynamic buttons before injection.
