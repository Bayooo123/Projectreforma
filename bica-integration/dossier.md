# Bica Integration Dossier: Reforma Legal OS
**Date:** February 17, 2026
**To:** Titoluwa Amoo, Fladov
**From:** Engineering Team, Reforma
**Subject:** Formal Handover of App Manifest and Entity Playbooks (v1.0)

---

## 1. Executive Summary
Reforma Legal OS is a comprehensive practice management system designed for modern law firms. This dossier provides the Fladov team with the necessary configuration and business logic blueprints to integrate Reforma as a native App on the Bica platform.

## 2. App Manifest (`manifest.json`)
The manifest defines the "Passport" for Reforma on Bica, including metadata, the "Chameleon UI" branding (curated for legal environments), and technical communication protocols. **Note:** All actions are gated by Reforma's internal RBAC system.

```json
{
    "app_id": "reforma_os",
    "name": "Reforma Legal OS",
    "description": "Draft briefs, manage clients, and track finances directly from Bica, subject to RBAC.",
    "version": "1.1.0",
    "ui_theme": {
        "brand_color": "#121826",
        "logo_url": "https://reforma.ng/assets/logo-icon.png",
        "greeting_message": "Good morning, {user.name}. How can Reforma assist your practice today?",
        "suggested_prompts": [
            "Draft a new litigation brief",
            "View upcoming court dates",
            "Generate an invoice for Client X",
            "Record a payment of ₦50,000"
        ]
    }
}
```

---

## 3. Core Entity Playbooks

### 3.1 Client & Brief (Core Operations)
These entities handle the fundamental legal workflows. Brief editing and deletion are restricted to senior roles (Managing Partner/Admin).

### 3.2 Invoice & Payment (Financial Operations)
Highly sensitive entities restricted to Finance and Admin roles.

| Entity | Description | Business Rules (AI Commands) |
| :--- | :--- | :--- |
| **Invoice** | Billing for legal services | Must confirm user role before creation. Requires Client link. |
| **Payment** | Inbound transaction records | Restricted to Finance staff. Must tie to Client/Invoice. |

---

## 4. Role-Based Access Control (RBAC) Integration
Bica's conversational intelligence is programmed via the Playbook `description` fields to:
1.  **Identify Authorization:** Check user role context before executing sensitive mutations.
2.  **Verify Compliance:** Ensure mandatory fields and relationships (e.g., Brief-to-Client) are satisfied before persistence.
3.  **Proactive Security:** Alert the user if they lack the necessary clearance for a requested financial action.

---

## 4. Technical Specifications & Endpoints
*   **Authentication:** Reforma uses a secure OAuth2-based flow. Fladov users will be redirected to the `auth_url` for one-time workspace coupling.
*   **Operations:** All data operations (Create, Read, Update, Delete) are handled via the `/execute` relative path.
*   **Previews:** Record previews are served as headless iframe views at `https://app.reforma.ng/embed/{entity}/{id}`.

## 5. Next Steps
1.  **Validation:** Fladov team to validate the JSON schema of the provided playbooks.
2.  **Sandbox Keys:** Reforma will provide API keys for the Bica staging environment.
3.  **Endpoint Implementation:** Finalizing the `/execute` logic for dynamic entity manipulation.

---
*For further technical queries, please reach out to the Reforma Engineering Team.*
