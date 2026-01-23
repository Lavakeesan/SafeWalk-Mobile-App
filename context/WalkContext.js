import React, { createContext, useContext, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, collection, getDocs, deleteDoc, addDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

// Simple in-app store for session/locations/alerts with Firebase sync
const WalkContext = createContext(null);

export function WalkProvider({ children }) {
  const { user } = useAuth();
  const [session, setSession] = useState(null); // { id, contact, status, startedAt, endedAt }
  const [locations, setLocations] = useState([]); // [{lat,lng,speed,accuracy,ts}]
  const [alerts, setAlerts] = useState([]); // [{type,message,active,ts}]
  const [history, setHistory] = useState([]); // array of past sessions
  const lastUpdateRef = useRef(0);

  // contacts shown across the app (Dashboard, Trusted Contacts)
  const [contacts, setContacts] = useState([]);

  // Load user data from Firebase when user logs in
  useEffect(() => {
    if (user?.uid) {
      loadUserData();
    } else {
      // Clear data when user logs out
      setContacts([]);
      setHistory([]);
      setSession(null);
      setLocations([]);
      setAlerts([]);
    }
  }, [user?.uid]);

  /**
   * Load user's contacts and walk history from Firebase
   */
  const loadUserData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      // 1. Load User Profile
      try {
        await getDoc(doc(db, 'users', user.uid));
      } catch (e) {
        console.error('Permission Denied: users table', e.message);
      }

      // 2. Load Trusted Contacts
      try {
        const contactsRef = collection(db, 'trusted_contacts');
        const contactsQuery = query(contactsRef, where('userId', '==', user.uid));
        const contactsSnap = await getDocs(contactsQuery);
        setContacts(contactsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error('Permission Denied: trusted_contacts table', e.message);
      }

      // 3. Load Walk Sessions
      try {
        const sessionsRef = collection(db, 'walk_sessions');
        const sessionsQuery = query(
          sessionsRef,
          where('userId', '==', user.uid),
          orderBy('startedAt', 'desc')
        );
        const sessionsSnap = await getDocs(sessionsQuery);
        setHistory(sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        // This might fail if the index isn't created yet
        if (e.message.includes('requires an index')) {
          console.error('Action Required: Click the link in your console to create a Firestore Index for walk_sessions');
        } else {
          console.error('Permission Denied: walk_sessions table', e.message);
        }
      }

    } catch (error) {
      console.error('General Data Loading Error:', error);
    }
  }, [user?.uid]);

  /**
   * Add a new trusted contact
   * Saves to Firebase and updates local state
   */
  const addContact = useCallback(async (contact) => {
    const newContactData = {
      userId: user.uid, // Relationship key
      name: contact?.name || 'Unnamed',
      email: contact?.email || '',
      phone: contact?.phone || '',
      createdAt: new Date().toISOString()
    };

    if (user?.uid) {
      try {
        const docRef = await addDoc(collection(db, 'trusted_contacts'), newContactData);
        const contactWithId = { id: docRef.id, ...newContactData };
        setContacts((prev) => [...prev, contactWithId]);
        return contactWithId;
      } catch (error) {
        console.error('Error adding contact to Firebase:', error);
        throw error;
      }
    } else {
      const localContact = { id: `c-${Date.now()}`, ...newContactData };
      setContacts((prev) => [...prev, localContact]);
      return localContact;
    }
  }, [user?.uid]);

  /**
   * Remove a trusted contact
   * Removes from Firebase and updates local state
   */
  const removeContact = useCallback(async (id) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));

    if (user?.uid) {
      try {
        await deleteDoc(doc(db, 'trusted_contacts', id));
      } catch (error) {
        console.error('Error removing contact from Firebase:', error);
      }
    }
  }, [user?.uid]);

  /**
   * Update an existing trusted contact
   */
  const updateContact = useCallback(async (updatedContact) => {
    const { id, ...data } = updatedContact;

    setContacts((prev) => {
      return prev.map((c) => (c.id === id ? updatedContact : c));
    });

    if (user?.uid) {
      try {
        await setDoc(doc(db, 'trusted_contacts', id), data, { merge: true });
      } catch (err) {
        console.error('Error updating contact in Firebase:', err);
      }
    }
  }, [user?.uid]);

  /**
   * Start a new walk session
   */
  const start = useCallback((contact, startLocation = null) => {
    const id = Date.now().toString();
    const newSession = {
      id,
      contact,
      status: 'active',
      startedAt: Date.now(),
      startLocation: startLocation,
      endLocation: null,
      endedAt: null
    };
    setSession(newSession);
    setLocations(startLocation ? [startLocation] : []);
    setAlerts([]);
    lastUpdateRef.current = 0;

    // We don't save to Firebase immediately here because we don't have all details yet (end time/location).
    // It will be saved at the end of the session in the walkSessions history.
  }, []);

  /**
   * End the current walk session
   * Saves session to Firebase history
   */
  const end = useCallback(async () => {
    if (!session) return;

    // Capture starting and ending locations from the points collected
    const startLoc = locations.length > 0 ? {
      lat: locations[0].lat,
      lng: locations[0].lng,
      ts: locations[0].ts
    } : null;

    const endLoc = locations.length > 0 ? {
      lat: locations[locations.length - 1].lat,
      lng: locations[locations.length - 1].lng,
      ts: locations[locations.length - 1].ts
    } : null;

    const sessionData = {
      userId: user.uid, // Relationship key
      contact: session.contact,
      status: 'ended',
      startedAt: session.startedAt,
      endedAt: Date.now(),
      startLocation: startLoc,
      endLocation: endLoc
    };

    if (user?.uid) {
      try {
        const docRef = await addDoc(collection(db, 'walk_sessions'), sessionData);
        const ended = { id: docRef.id, ...sessionData };
        setSession(ended);
        setHistory((prev) => [ended, ...prev]); // Add to start of history
        console.log('Session saved to Firebase successfully');
        return ended;
      } catch (error) {
        console.error('Error saving session to Firebase:', error);
      }
    }

    const localEnded = { id: session.id, ...sessionData };
    setSession(localEnded);
    setHistory((prev) => [...prev, localEnded]);
    return localEnded;
  }, [user?.uid, session, locations]);

  /**
   * Delete a session from history
   */
  const deleteHistorySession = useCallback(async (id) => {
    setHistory((prev) => prev.filter((s) => s.id !== id));

    if (user?.uid) {
      try {
        await deleteDoc(doc(db, 'walk_sessions', id));
        console.log('Session removed from Firebase history');
      } catch (error) {
        console.error('Error removing session from Firebase:', error);
      }
    }
  }, [user?.uid]);

  const pushLocation = useCallback((p) => {
    setLocations((prev) => [...prev, p]);
    lastUpdateRef.current = p.ts || Date.now();
  }, []);

  const setAlert = useCallback((type, message, active) => {
    setAlerts((prev) => {
      const idx = prev.findIndex((a) => a.type === type);
      if (idx === -1) return [...prev, { type, message, active, ts: Date.now() }];
      const copy = [...prev];
      copy[idx] = { ...copy[idx], message, active, ts: Date.now() };
      return copy;
    });
  }, []);

  const value = useMemo(
    () => ({
      session,
      locations,
      alerts,
      history,
      start,
      end,
      pushLocation,
      setAlert,
      lastUpdateRef,
      contacts,
      addContact,
      removeContact,
      updateContact,
      deleteHistorySession
    }),
    [
      session, locations, alerts, history, start, end,
      pushLocation, setAlert, contacts, addContact, removeContact, updateContact, user?.uid
    ]
  );

  return <WalkContext.Provider value={value}>{children}</WalkContext.Provider>;
}

export const useWalk = () => {
  const ctx = useContext(WalkContext);
  if (!ctx) throw new Error('useWalk must be used within WalkProvider');
  return ctx;
};
