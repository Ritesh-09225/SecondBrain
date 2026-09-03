# Gemini Reflection Journal

A secure, private, user-authenticated reflection and journaling web application powered by **Gemini 3.1 Flash-Lite (Cost-Optimized)** and **Cloud Firestore** with **Firebase Authentication (Google Sign-In)**.

---

## 1. Architecture & Security Model

- **Authentication**: Passwordless federated authentication using Firebase Auth (Google Sign-In popup). No passwords or emails are stored directly in application code.
- **Database Isolation**: Cloud Firestore document store strictly partitioned under `/users/{userId}/interactions/{interactionId}`.
- **AI Processing**: Server-side Next.js route (`/api/gemini`) executing resilient model generation using `@google/genai` with a cost-optimized fallback ladder:
  1. `gemini-3.1-flash-lite` (Primary: Lowest cost & ultra-low latency with minimal thinking token overhead)
  2. `gemini-flash-latest` (Dynamic Alias Fallback)
  3. `gemini-3.7-flash` (Resilient Standard Fallback)
  4. `gemini-3.6-flash` (Quaternary Fallback)
- **Zero-Crash Payload Hygiene**: Recursive undefined-stripping (`sanitizeForFirestore`) guarantees valid Firestore data structures and transactional verification.

---

## 2. Environment & Prerequisites

Ensure the Google Cloud SDK (`gcloud`) is installed and configured:

```bash
# Authenticate and set default project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud service APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

---

## 3. Secret Management Setup

Create and bind the `GEMINI_API_KEY` secret in Google Cloud Secret Manager:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Compute/Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Google Maps Platform Setup (Location-Aware Entries)

1. Enable **Maps JavaScript API**, **Places API (New)**, and **Geocoding API** in the Google Cloud Console.
2. Create an API Key and enforce **Application Restrictions** (HTTP referrers for authorized domains) and **API Restrictions** (limiting only to the 3 required Maps APIs).
3. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in your environment or Secret Manager.

---

## 4. Firestore Security Rules

Deploy the owner-bound security rules to ensure user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile isolation
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Isolated user interactions (prompts, reflection responses, multi-turn messages)
      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Default deny all other paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

To deploy rules with the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 5. Cloud Run Deployment Flow

Build and deploy the application to Google Cloud Run:

```bash
# Deploy to Cloud Run with Secret Manager environment mapping
gcloud run deploy gemini-reflection-journal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

---

## 6. Required Campaign Labeling

Update the deployed Cloud Run service with the mandatory challenge verification label:

```bash
gcloud run services update gemini-reflection-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 7. Local Development

```bash
# Install dependencies
npm install

# Run the local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.
