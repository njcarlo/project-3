# Auto-deploy (GitHub Actions → Firebase App Hosting)

`.github/workflows/deploy.yml` creates an **App Hosting rollout** for every push
to `main` (each merged PR), building and deploying that exact commit. You can
also trigger it manually from the repo's **Actions** tab → *Deploy to Firebase
App Hosting* → **Run workflow**.

## One-time setup

The workflow needs **one** thing added in the GitHub repo under
**Settings → Secrets and variables → Actions**.

The backend ID defaults to `mezastar-collector` (this project's backend), so no
variable is required. If you ever rename the backend, add a repository
**Variable** `APP_HOSTING_BACKEND_ID` with the new ID to override the default.

### Secret: `FIREBASE_SERVICE_ACCOUNT`

A Google Cloud service-account **JSON key** used to authenticate the rollout.

1. In the [Google Cloud console](https://console.cloud.google.com/) for project
   `mezastar-collector`, create (or reuse) a service account.
2. Grant it the roles needed to create App Hosting rollouts:
   - **Firebase App Hosting Admin** (`roles/firebaseapphosting.admin`)
   - **Cloud Build Editor** (`roles/cloudbuild.builds.editor`)
   - **Service Account User** (`roles/iam.serviceAccountUser`)
3. Create a JSON key for it and download the file.
4. Paste the **entire JSON contents** as a repo **Secret** named
   `FIREBASE_SERVICE_ACCOUNT`.

Once both are set, merge (or push) to `main` and the workflow deploys
automatically. Watch progress under the **Actions** tab.

## Prerequisite: connect the backend to this repo

App Hosting builds from the connected GitHub repository, so the backend must be
linked to it once (Firebase console → **App Hosting** → your backend →
**Settings**). After that, this workflow drives the rollouts — you don't need
the console's automatic-rollout option enabled.

## Alternative: no workflow at all

If you'd rather not use Actions, you can instead enable App Hosting's built-in
auto-rollout: in the Firebase console set the backend's **live branch** to
`main`. Every push then rolls out automatically with no CI needed.
