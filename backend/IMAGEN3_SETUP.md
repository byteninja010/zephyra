# Imagen 3 Setup Guide

## 🚀 Quick Setup for Vertex AI Imagen 3

### Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Create or Select a Project**
   - Click the project dropdown at the top
   - Click "New Project" or select an existing one
   - Note down your **Project ID** (e.g., `my-project-12345`)

3. **Enable Billing**
   - Go to "Billing" in the left menu
   - Link a billing account (required for Vertex AI)
   - ⚠️ **Note**: Imagen 3 charges per image generated (~$0.04 per image)

4. **Enable Vertex AI API**
   - Go to: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com
   - Click "Enable"
   - Wait for it to finish enabling

### Step 2: Create Service Account

1. **Go to IAM & Admin**
   - Navigate to: https://console.cloud.google.com/iam-admin/serviceaccounts

2. **Create Service Account**
   - Click "Create Service Account"
   - **Service account name**: `imagen-service-account`
   - **Service account ID**: `imagen-service-account` (auto-filled)
   - Click "Create and Continue"

3. **Grant Permissions**
   - Select role: `Vertex AI User`
   - Click "Continue"
   - Click "Done"

4. **Create JSON Key**
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Select "JSON"
   - Click "Create"
   - **Save the downloaded JSON file as `google-credentials.json` in your `backend` folder**

### Step 3: Configure Environment Variables

1. **Open `backend/.env` file**

2. **Add these lines** (replace with your values):

```env
# Google Cloud / Vertex AI Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

**Example**:
```env
GOOGLE_CLOUD_PROJECT_ID=zephyra-therapy-12345
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

### Step 4: Place Credentials File

1. **Move the downloaded JSON file** to `backend/google-credentials.json`

2. **Verify the file location**:
   ```
   backend/
   ├── google-credentials.json  ← Should be here
   ├── .env
   ├── server.js
   └── ...
   ```

### Step 5: Restart Backend Server

1. **Stop the current server** (Ctrl + C in terminal)

2. **Restart**:
   ```bash
   npm run dev
   ```

3. **Check logs** - You should see:
   ```
   ✅ Vertex AI initialized
   ```

### Step 6: Test Image Generation

1. **Refresh your frontend**
2. **Start a new session**
3. **Check backend logs** for:
   ```
   📸 GENERATING BACKGROUND IMAGE WITH IMAGEN 3
   ✅ Successfully generated image with Imagen 3!
   ```

## 🎯 Supported Regions

Imagen 3 is available in these regions:
- `us-central1` (default, recommended)
- `us-east4`
- `us-west1`
- `europe-west4`

## 💰 Cost Estimation

- **Imagen 3**: ~$0.04 per image
- **Average usage**: 1 image per therapy session
- **Monthly cost** (100 sessions): ~$4.00

## 🔧 Troubleshooting

### Error: "Project ID not found"
- Double-check your Project ID in `.env`
- Make sure billing is enabled

### Error: "Permission denied"
- Verify service account has `Vertex AI User` role
- Check credentials file path is correct

### Error: "Quota exceeded"
- You may have hit the free trial limit
- Check billing is properly set up

### Error: "API not enabled"
- Go to https://console.cloud.google.com/apis/library/aiplatform.googleapis.com
- Make sure Vertex AI API is enabled

## 📝 Notes

- The credentials file (`google-credentials.json`) should **NEVER** be committed to Git
- It's already in `.gitignore` for security
- Keep your service account key secure
- Images are generated fresh for each session and embedded as base64

## ✅ Verification Checklist

- [ ] Google Cloud Project created
- [ ] Billing enabled
- [ ] Vertex AI API enabled
- [ ] Service account created with Vertex AI User role
- [ ] JSON key downloaded and saved as `google-credentials.json`
- [ ] `.env` file updated with project ID
- [ ] Backend server restarted
- [ ] Test session shows Imagen 3 background

---

**Need help?** Check the console logs in both frontend and backend for detailed error messages.


