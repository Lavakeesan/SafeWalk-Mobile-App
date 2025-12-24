# SafeWalk - Quick Setup Guide

## ✅ Current Status

Your SafeWalk app is now fully integrated with Firebase! Here's what's been implemented:

### ✨ Completed Features

1. **Firebase Integration**
   - ✅ Firebase configuration added
   - ✅ Authentication setup (Email/Password)
   - ✅ Firestore database integration
   - ✅ Real-time data sync

2. **Authentication System**
   - ✅ User registration with validation
   - ✅ User login
   - ✅ Logout functionality
   - ✅ Auth state persistence

3. **Screens**
   - ✅ SignIn - Firebase authentication
   - ✅ Register - Create account with Firebase
   - ✅ Dashboard - Main hub
   - ✅ Trusted Contacts - Manage contacts (synced with Firebase)
   - ✅ Observer - Walk session tracking
   - ✅ Profile - User info and logout

4. **Data Management**
   - ✅ Contacts stored in Firebase
   - ✅ Walk sessions saved to Firebase
   - ✅ User-specific data isolation
   - ✅ Real-time sync

## 🚀 Next Steps

### 1. Enable Firebase Services (IMPORTANT!)

You need to enable these in Firebase Console:

#### Enable Authentication:
1. Go to https://console.firebase.google.com/project/safewalk-c472e
2. Click **Authentication** in left menu
3. Click **Get started**
4. Go to **Sign-in method** tab
5. Click **Email/Password**
6. Toggle **Enable**
7. Click **Save**

#### Create Firestore Database:
1. Go to https://console.firebase.google.com/project/safewalk-c472e
2. Click **Firestore Database** in left menu
3. Click **Create database**
4. Select **Start in test mode**
5. Choose region (asia-south1 for Sri Lanka)
6. Click **Enable**

#### Set Firestore Security Rules:
1. In Firestore Database, click **Rules** tab
2. Replace with:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
3. Click **Publish**

### 2. Test the App

1. **Restart Expo** (if running):
   ```bash
   # Press Ctrl+C to stop
   npx expo start -c
   ```

2. **Create a test account**:
   - Open the app
   - Click "Create Account"
   - Fill in:
     - Full Name: Test User
     - Email: test@example.com
     - Password: test123 (min 6 chars)
   - Click "Create Account"

3. **Sign in**:
   - Use the credentials you just created
   - You should see the Dashboard

4. **Test features**:
   - Add a trusted contact
   - Start a walk session
   - View profile
   - Logout and sign in again

## 🔧 Troubleshooting

### Error: "Firebase: Error (auth/operation-not-allowed)"
**Solution**: Enable Email/Password authentication in Firebase Console (see step 1 above)

### Error: "Firebase: Error (firestore/permission-denied)"
**Solution**: Create Firestore database and set security rules (see step 1 above)

### Error: "Network request failed"
**Solution**: Check your internet connection

### App won't load
**Solution**: 
```bash
rm -rf node_modules
npm install
npx expo start -c
```

## 📱 How to Use the App

### For Students/Users:

1. **Register**:
   - Open app → Create Account
   - Enter your details
   - Create account

2. **Add Trusted Contacts**:
   - Dashboard → Trusted Contacts
   - Click "Add Contact"
   - Enter name, email, phone
   - Save

3. **Start a Walk**:
   - Dashboard → Click on a contact
   - Or Trusted Contacts → Tap contact
   - Confirm "Start walk?"
   - Observer screen shows tracking

4. **End Walk**:
   - In Observer screen
   - Click "End Walk"
   - Session saved to history

5. **View History**:
   - Dashboard → See recent sessions
   - Shows start/end times

6. **Profile**:
   - Dashboard → Profile
   - View your info
   - Logout when done

## 📊 Firebase Console URLs

- **Project**: https://console.firebase.google.com/project/safewalk-c472e
- **Authentication**: https://console.firebase.google.com/project/safewalk-c472e/authentication/users
- **Firestore**: https://console.firebase.google.com/project/safewalk-c472e/firestore

## 🎓 For Your Project Report

### Technologies Used:
- React Native (Expo SDK 52)
- Firebase Authentication
- Cloud Firestore
- React Navigation
- React Context API
- AsyncStorage (for local caching)

### Key Features Implemented:
1. User authentication (register/login/logout)
2. Trusted contacts management
3. Walk session tracking
4. Session history
5. User profile
6. Real-time data synchronization
7. Offline data persistence

### Firebase Data Structure:
```
users/
  {userId}/
    - fullName
    - email
    - createdAt
    - trustedContacts[]
    - walkSessions[]
```

## ✅ Checklist Before Submission

- [ ] Firebase Authentication enabled
- [ ] Firestore database created
- [ ] Security rules configured
- [ ] App tested with real account
- [ ] All features working
- [ ] Screenshots taken
- [ ] README.md reviewed
- [ ] Code commented
- [ ] Project documented

## 🎉 You're All Set!

Your SafeWalk app is now complete with full Firebase integration. Just enable the Firebase services and you're ready to test!

**Good luck with your project! 🚀**
