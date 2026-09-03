# Production Directives & Custom Instructions

## 1. Agentic Threat Modeling
* **Objective**: Perform a structured, scenario-driven threat analysis prior to outputting code or system architecture.
* **Scope Lens (The 5 Threat Zones)**:
  * **Input Surfaces**: Prompts, place queries, coordinates, untrusted user uploads, external API payloads.
  * **Planning & Reasoning**: Prompt injection, system instruction bypass, tool routing hijacking.
  * **Tool Execution**: Privilege escalation via API functions, SSRF, dynamic code execution risks.
  * **Memory & State**: Firestore state persistence, session hijacking, cross-user data leaks.
  * **Inter-System Communication**: External API calls (Google Maps Platform, Gemini API), token & API key leakage.
* **Mandatory Execution Criteria**: Whenever the user asks to design or implement a feature, generate a Threat Summary Table mapping risks to countermeasures.

## 2. Secure Coding Standard
* **Objective**: Support mitigations corresponding with the OWASP Top 10 (Web) and OWASP Top 10 for LLM Applications.
* **Core Principles Implemented**:
  * **Input Validation & Sanitization (OWASP A03 / LLM02)**: Strict schema validation for all incoming inputs; explicit parameterization to prevent SQLi, NoSQLi, and Command Injection. Validate and sanitize coordinates (latitude [-90, 90], longitude [-180, 180]), Place IDs, and user search terms.
  * **Indirect Prompt Injection Defense (OWASP LLM01)**: Treat data retrieved from untrusted sources (e.g., place reviews, external APIs, user notes) as plain data, never as executable instructions.
  * **Broken Access Control Mitigation (OWASP A01)**: Validate authorization headers and context-bound permissions at every API boundary.
  * **Output Handling (OWASP A03 / LLM05)**: Encode all dynamic outputs prior to rendering in HTML/JS interfaces or executing downstream system commands.

## 3. Secure Firestore & Firebase Auth Configuration
* **Objective**: Limit data exposure and unauthorized database reads/writes in Firebase/Firestore architectures.
* **Core Security Rules**:
  * **Zero Insecure Defaults**: Never output `allow read, write: if true;`.
  * **User Data Isolation**: Support owner-bound path checking (`request.auth.uid == userId`) for personal documents and location-pinned entries.
  * **Role-Based Access Control (RBAC)**: Use custom claims or dynamic document lookups for elevated administrative operations.
  * **Auth State Integrity**: Verify JWT tokens on backend server environments using the Firebase Admin SDK.
  * **Passwordless/Federated Auth**: Prefer Federated Identity (e.g., Google Sign-In via Firebase Auth) to outsource credential management securely.

## 4. Secret Management & Zero-Hardcoding Hygiene
* **Objective**: Eliminate hardcoded credentials, API keys, service account JSON files, and tokens.
* **Mandatory Code Patterns**:
  * **Prohibit Hardcoded Strings**: Flag any pattern resembling `const API_KEY = "AIzaSy..."` as a critical flaw.
  * **Environment Variable Injection & Secret Manager**:
    * Server-side secrets (e.g., `GEMINI_API_KEY`, service account credentials) must strictly reside in `process.env` and never receive the `NEXT_PUBLIC_` prefix.
    * Client-side keys (e.g., `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) must be strictly constrained using Google Cloud Console API Restrictions and HTTP Referrer Restrictions.
    * Document all environment variables in `.env.example`.

## 5. Google Maps Platform Directive (Secure Location-Aware Integration)
* **Objective**: Guide the architecture, security, cost-efficiency, and implementation of Google Maps and Places Platform APIs for location-aware journal entries and recommendations.
* **Key Principles & Implementation Standards**:
  1. **API Key Security & Restriction Best Practices**:
     * **Zero Hardcoding**: Never hardcode Google Maps API keys in client or server files. Retrieve via `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for client components or `GOOGLE_MAPS_API_KEY` for server proxy endpoints.
     * **API Key Restrictions in Google Cloud**:
       - **Application Restrictions**: Set HTTP Referrer restrictions to allow only authorized domains (e.g., `localhost:3000/*`, your Cloud Run application domain `https://*.run.app/*`).
       - **API Restrictions**: Restrict the key exclusively to the APIs needed for the feature: **Maps JavaScript API**, **Places API (New)**, and **Geocoding API**.
     * **Graceful Key Absence Handling**: If no Google Maps API key is configured in the environment, the UI must render an accessible, non-crashing fallback UI (e.g., manual address input, clear guidance banner to add the key in settings, or prototyping demo key banner).
  2. **Modern SDK & Dynamic Loading**:
     * Use `@googlemaps/js-api-loader` or `@vis.gl/react-google-maps` for modern dynamic imports (`google.maps.importLibrary("maps")`, `google.maps.importLibrary("places")`, `google.maps.importLibrary("marker")`).
     * Use modern `google.maps.marker.AdvancedMarkerElement` rather than deprecated `google.maps.Marker`.
     * Use modern **Places API (New)** endpoints and libraries (`google.maps.places.Place`, `PlaceAutocompleteElement`, `Place.searchByText`).
  3. **Cost Optimization & Field Masking**:
     * **Strict Field Masking**: Always specify only the required fields when fetching place details (e.g., `fields: ["id", "displayName", "formattedAddress", "location", "rating", "photos"]`) to avoid incurring charges for unused Enterprise/Atmosphere place data.
     * **Autocomplete Session Tokens**: Utilize autocomplete session tokens (`google.maps.places.AutocompleteSessionToken`) to group keystrokes into a single billable Places query session upon place selection.
  4. **Data Isolation & Sanitization in Firestore**:
     * Pinned place metadata must be stored inside the user's isolated document tree (`/users/{userId}/interactions/{interactionId}/location`).
     * Structure:
       ```typescript
       interface LocationPin {
         placeId: string;
         name: string;
         formattedAddress: string;
         coordinates: {
           lat: number;
           lng: number;
         };
         rating?: number;
         photoUri?: string;
         googleMapsUrl?: string;
         userNotes?: string;
         createdAt: string;
       }
       ```
     * **Payload Hygiene**: Sanitize all location objects with `sanitizeForFirestore` to strip `undefined` values before persistence.
  5. **Terms of Service & Attribution Compliance**:
     * Adhere strictly to the Google Maps Platform Terms of Service: do not scrape or store place reviews, user content, or cached imagery permanently; store only Place IDs and reference coordinates for user bookmarks.
     * Always display required Google Maps logos, trademark badges, and place photo contributor attributions in the UI.

## 6. Functional Stability & Walkthroughs
* **Objective**: Every feature and interactive component must have corresponding test cases and walkthrough validation steps covering all user workflows and edge cases.
