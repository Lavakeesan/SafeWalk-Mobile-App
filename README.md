# SafeWalk - Personal Safety Mobile Application

A React Native mobile application for personal safety, designed for users who walk alone. Built for CST 345-2 at Uva Wellassa University of Sri Lanka.

## 🎯 Project Overview

SafeWalk is a mobile application that helps users stay safe while walking alone by:
- Tracking walk sessions with trusted contacts
- Managing emergency contacts
- Recording session history
- Providing real-time location updates (simulated)

## 🛠️ Technology Stack

- **Framework**: React Native (Expo)
- **Backend**: Firebase
  - Firebase Authentication (Email/Password)
  - Cloud Firestore (Database)
- **Navigation**: React Navigation
- **UI Components**: React Native Paper
- **State Management**: React Context API

## 📁 Project Structure

```
safewalk/
├── App.js                 # Main app entry point with navigation
├── index.js              # Expo entry point
├── config/
│   └── firebase.js       # Firebase configuration
├── context/
│   ├── AuthContext.js    # Authentication state management
│   └── WalkContext.js    # Walk session state management
├── screens/
│   ├── SignIn.js         # Login screen
│   ├── Register.js       # Registration screen
│   ├── Dashboard.js      # Main dashboard
│   ├── TrustedContacts.js # Manage trusted contacts
│   ├── Observer.js       # Active walk session tracking
│   └── Profile.js        # User profile and logout
├── components/
│   ├── Header.js         # Reusable header component
│   ├── SectionCard.js    # Dashboard card component
│   ├── SafetyBanner.js   # Safety information banner
│   └── ContactRow.js     # Contact list item
└── theme.js              # App theme configuration
```

## 🚀 Firebase Setup Instructions

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: **SafeWalk**
4. Follow the setup wizard (disable Google Analytics if not needed)

### Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider
5. Click "Save"

### Step 3: Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Select **Start in test mode** (for development)
4. Choose your preferred region
5. Click "Enable"

### Step 4: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the **Web** icon (`</>`)
4. Register app with nickname: **SafeWalk Web**
5. Copy the `firebaseConfig` object
6. The configuration is already added to `config/firebase.js`

### Step 5: Configure Firestore Security Rules

In Firestore Database > Rules, add these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 📦 Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo Go app on your mobile device

### Setup Steps

1. **Clone the repository**
   ```bash
   cd safewalk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Run on device**
   - Scan the QR code with Expo Go app (Android)
   - Scan with Camera app (iOS)

## 📱 Features

### 1. Authentication
- ✅ User registration with email and password
- ✅ User login
- ✅ Logout functionality
- ✅ Firebase Authentication integration

### 2. Dashboard
- ✅ Main control screen after login
- ✅ Quick access to all features
- ✅ Session history overview
- ✅ Contact count display

### 3. Trusted Contacts Management
- ✅ Add trusted contacts (Name, Email, Phone)
- ✅ View list of contacts
- ✅ Delete contacts
- ✅ Sync with Firebase
- ✅ Start walk session with contact

### 4. Walk Session Feature
- ✅ Start a walk session
- ✅ Real-time location tracking (simulated)
- ✅ Active session status display
- ✅ End session functionality
- ✅ Save session to Firebase

### 5. Session History
- ✅ Display previous walk sessions
- ✅ Show start and end times
- ✅ Contact information
- ✅ Persistent storage in Firebase

### 6. Profile Screen
- ✅ Display user information
- ✅ Show email and name
- ✅ Logout option
- ✅ User ID display

## 🔥 Firebase Data Structure

```javascript
users/
  {userId}/
    fullName: string
    email: string
    createdAt: timestamp
    trustedContacts: [
      {
        id: string
        name: string
        email: string
        phone: string
      }
    ]
    walkSessions: [
      {
        id: string
        contact: object
        status: string
        startedAt: timestamp
        endedAt: timestamp
      }
    ]
```

## 🎨 UI/UX Features

- Clean and minimal design
- Responsive layout
- Material Design icons
- Smooth animations
- User-friendly navigation
- Error handling with alerts

## 🔒 Security Features

- Firebase Authentication
- Secure password storage
- User-specific data access
- Firestore security rules
- Input validation

## 📝 Code Quality

- Functional components
- React Hooks
- Context API for state management
- Commented code
- Modular structure
- Error handling

## 🧪 Testing

To test the app:

1. **Register a new account**
   - Use a valid email format
   - Password must be at least 6 characters

2. **Add trusted contacts**
   - Navigate to Trusted Contacts
   - Add contact with name and phone

3. **Start a walk session**
   - Select a contact from Dashboard or Trusted Contacts
   - Observe simulated location tracking

4. **View session history**
   - Check Dashboard for past sessions

5. **Access profile**
   - View your account information
   - Test logout functionality

## 🐛 Troubleshooting

### Common Issues

1. **Firebase connection errors**
   - Verify Firebase config in `config/firebase.js`
   - Check internet connection
   - Ensure Firebase services are enabled

2. **Authentication errors**
   - Verify Email/Password is enabled in Firebase Console
   - Check password length (minimum 6 characters)

3. **Expo errors**
   - Clear cache: `npx expo start -c`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

## 👥 Team Information

**University**: Uva Wellassa University of Sri Lanka  
**Course**: CST 345-2  
**Project**: SafeWalk Personal Safety App

## 📄 License

This project is licensed under the 0BSD License.

## 🙏 Acknowledgments

- Firebase for backend services
- Expo for React Native development
- React Navigation for routing
- React Native Paper for UI components

## 📞 Support

For issues or questions, please refer to:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)

---

**Note**: This is a university project for educational purposes. For production use, additional security measures and features should be implemented.
