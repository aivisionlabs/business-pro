# Firebase Firestore Setup Guide

This guide will help you set up Firebase Firestore to replace the local JSON storage in your business-pro application.

## Prerequisites

1. A Google account
2. Node.js and npm installed
3. Your business-pro project set up

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select an existing project
3. Enter a project name (e.g., "business-pro")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Firestore Database

1. In your Firebase project, click on "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development (you can secure it later)
4. Select a location for your database (choose the closest to your users)
5. Click "Done"

## Step 3: Get Firebase Configuration

1. In your Firebase project, click on the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname (e.g., "business-pro-web")
6. Copy the configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add the following environment variables using the values from Step 3:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

3. Restart your development server after adding environment variables

## Step 5: Set Up Firestore Security Rules

1. In your Firebase project, go to "Firestore Database" → "Rules"
2. Replace the default rules with the following (for development):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all users under any document
    // WARNING: This is for development only. Secure this for production!
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click "Publish"

**⚠️ Security Note:** The above rules allow anyone to read and write to your database. For production, implement proper authentication and authorization rules.

## Step 6: Run Data Migration

1. Start your development server: `npm run dev`
2. Navigate to a page where you can access the MigrationTool component
3. Click "Migrate Plant Master Data" to transfer your plant master data
4. Verify the data appears in your Firebase Console under "Firestore Database"

## Step 7: Test the Integration

1. Create a new business case using the Firebase services
2. Verify it appears in your Firestore database
3. Test updating and deleting operations

## Project Structure

After setup, your Firebase integration will be organized as follows:

```
src/lib/firebase/
├── config.ts          # Firebase configuration
├── firestore.ts       # Firestore service classes
├── migrate.ts         # Data migration utilities
└── hooks/
    └── useFirestore.ts # React hooks for Firebase data
```

## Available Services

- **BusinessCaseService**: CRUD operations for business cases
- **SkuService**: CRUD operations for SKUs within business cases
- **PlantMasterService**: CRUD operations for plant master data

## Available Hooks

- **useBusinessCases()**: Manage all business cases
- **useBusinessCase(id)**: Manage a single business case
- **useSkus(businessCaseId)**: Manage SKUs for a business case
- **usePlantMaster()**: Access plant master data

## Migration Process

The migration tool will:

1. Transfer plant master data from `src/data/plant-master.json`
2. Transfer business case scenarios from `src/data/scenarios/`
3. Maintain data relationships and IDs

## Troubleshooting

### Common Issues

1. **"Firebase: Error (auth/unauthorized)"**
   - Check your environment variables are correct
   - Ensure Firestore rules allow read/write access

2. **"Firebase: Error (firestore/permission-denied)"**
   - Check your Firestore security rules
   - Ensure you're in test mode for development

3. **Environment variables not loading**
   - Restart your development server after adding `.env.local`
   - Ensure variable names start with `NEXT_PUBLIC_`

### Getting Help

- Check the [Firebase Documentation](https://firebase.google.com/docs)
- Review the [Next.js Environment Variables guide](https://nextjs.org/docs/basic-features/environment-variables)
- Check the browser console for detailed error messages

## Next Steps

After successful setup:

1. Implement user authentication if needed
2. Set up proper Firestore security rules for production
3. Consider implementing offline persistence
4. Set up Firebase hosting for production deployment

## Production Considerations

1. **Security Rules**: Implement proper authentication and authorization
2. **Indexes**: Create composite indexes for complex queries
3. **Backup**: Set up automated backups
4. **Monitoring**: Enable Firebase Performance Monitoring
5. **Costs**: Monitor Firestore usage and costs
