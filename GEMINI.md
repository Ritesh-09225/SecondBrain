# Custom Instructions & Guidelines

Refer to `AGENTS.md` for the full set of persistent project guidelines and security directives, including:
1. **Agentic Threat Modeling**: Pre-implementation threat analysis table across 5 zones.
2. **Secure Coding Standard**: OWASP Web & LLM mitigations, input sanitization, and parameterized processing.
3. **Secure Firestore & Firebase Auth Configuration**: Owner-bound isolation (`/users/{userId}/*`), zero insecure defaults, passwordless/federated auth.
4. **Secret Management & Zero-Hardcoding Hygiene**: Server-side vs client-side secret separation, Google Cloud Secret Manager integration.
5. **Google Maps Platform Directive**:
   - Secure handling of `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` with HTTP Referrer and API restrictions.
   - Modern SDK usage with `@googlemaps/js-api-loader`, Places API (New), and `AdvancedMarkerElement`.
   - Strict field masking to reduce API costs and session token usage for Autocomplete.
   - Undefined-stripped Firestore location persistence under `/users/{userId}/interactions/{interactionId}/location`.
   - Attribution and Terms of Service compliance.
6. **Functional Stability & Walkthroughs**: Test walkthrough scenarios for every interactive capability.
