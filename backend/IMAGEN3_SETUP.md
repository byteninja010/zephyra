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
   - **Download and open the JSON file** - you'll need to copy values from it

### Step 3: Configure Environment Variables

1. **Open `backend/.env` file**

2. **Add these lines** (copy values from your downloaded JSON file):

```env
# Google Cloud / Vertex AI Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
GOOGLE_CLOUD_LOCATION=us-central1

# Google Service Account Credentials (from JSON file)
GOOGLE_CLOUD_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-private-key-here\n-----END PRIVATE KEY-----\n"
GOOGLE_CLOUD_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_CLOUD_CLIENT_ID=your-client-id
```

**Example** (copy these values from your JSON file):
```env
GOOGLE_CLOUD_PROJECT_ID=zephyra-therapy-12345
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLOUD_PRIVATE_KEY_ID=d2a4bbe3748eaedfaee48aa4057209854345
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLOUD_CLIENT_EMAIL=imagen-service-account@zephyra-therapy-12345.iam.gserviceaccount.com
GOOGLE_CLOUD_CLIENT_ID=110451012295463545345
```

**⚠️ Important Notes:**
- The `GOOGLE_CLOUD_PRIVATE_KEY` must be in double quotes `"..."`
- Keep the `\n` characters in the private key (don't replace with actual newlines)
- Copy the entire private key including the BEGIN and END lines
- After copying, you can safely **delete the JSON file** - it's no longer needed!

### Step 4: Restart Backend Server

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
- Check that all credentials in `.env` are correct
- Make sure `GOOGLE_CLOUD_PRIVATE_KEY` is in double quotes

### Error: "Quota exceeded"
- You may have hit the free trial limit
- Check billing is properly set up

### Error: "API not enabled"
- Go to https://console.cloud.google.com/apis/library/aiplatform.googleapis.com
- Make sure Vertex AI API is enabled

## 📝 Notes

- Credentials are stored securely in environment variables (`.env` file)
- The `.env` file should **NEVER** be committed to Git
- It's already in `.gitignore` for security
- Keep your service account credentials secure
- Images are generated fresh for each session and embedded as base64
- The downloaded JSON file can be deleted after copying values to `.env`

## ✅ Verification Checklist

- [ ] Google Cloud Project created
- [ ] Billing enabled
- [ ] Vertex AI API enabled
- [ ] Service account created with Vertex AI User role
- [ ] JSON key downloaded
- [ ] All credentials copied from JSON to `.env` file
- [ ] JSON file deleted (no longer needed)
- [ ] Backend server restarted
- [ ] Test session shows Imagen 3 background

---

**Need help?** Check the console logs in both frontend and backend for detailed error messages.


