import React, { createContext, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
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
  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setContacts(data.trustedContacts || []);
        setHistory(data.walkSessions || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  /**
   * Add a new trusted contact
   * Saves to Firebase and updates local state
   */
  const addContact = async (contact) => {
    const newContact = {
      id: contact?.id || `c-${Date.now()}`,
      name: contact?.name || 'Unnamed',
      email: contact?.email || '',
      phone: contact?.phone || '',
    };

    // Update local state immediately
    setContacts((prev) => [...prev, newContact]);

    // Sync to Firebase if user is logged in
    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          trustedContacts: arrayUnion(newContact)
        });
      } catch (error) {
        console.error('Error adding contact to Firebase:', error);
      }
    }

    return newContact;
  };

  /**
   * Remove a trusted contact
   * Removes from Firebase and updates local state
   */
  const removeContact = async (id) => {
    const contactToRemove = contacts.find((c) => c.id === id);

    // Update local state immediately
    setContacts((prev) => prev.filter((c) => c.id !== id));

    // Sync to Firebase if user is logged in
    if (user?.uid && contactToRemove) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          trustedContacts: arrayRemove(contactToRemove)
        });
      } catch (error) {
        console.error('Error removing contact from Firebase:', error);
      }
    }
  };

  /**
   * Start a new walk session
   */
  const start = (contact) => {
    const id = Date.now().toString();
    const newSession = {
      id,
      contact,
      status: 'active',
      startedAt: Date.now()
    };
    setSession(newSession);
    setLocations([]);
    setAlerts([]);
    lastUpdateRef.current = 0;
  };

  /**
   * End the current walk session
   * Saves session to Firebase history
   */
  const end = async () => {
    setSession((s) => {
      if (!s) return s;

      const ended = { ...s, status: 'ended', endedAt: Date.now() };

      // Add to history
      setHistory((prev) => [...prev, ended]);

      // Save to Firebase if user is logged in
      if (user?.uid) {
        updateDoc(doc(db, 'users', user.uid), {
          walkSessions: arrayUnion(ended)
        }).catch((error) => {
          console.error('Error saving session to Firebase:', error);
        });
      }

      return ended;
    });
  };

  const pushLocation = (p) => {
    setLocations((prev) => [...prev, p]);
    lastUpdateRef.current = p.ts || Date.now();
  };

  const setAlert = (type, message, active) => {
    setAlerts((prev) => {
      const idx = prev.findIndex((a) => a.type === type);
      if (idx === -1) return [...prev, { type, message, active, ts: Date.now() }];
      const copy = [...prev];
      copy[idx] = { ...copy[idx], message, active, ts: Date.now() };
      return copy;
    });
  };

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
      removeContact
    }),
    [session, locations, alerts, history, contacts, user?.uid]
  );

  return <WalkContext.Provider value={value}>{children}</WalkContext.Provider>;
}

export const useWalk = () => {
  const ctx = useContext(WalkContext);
  if (!ctx) throw new Error('useWalk must be used within WalkProvider');
  return ctx;
};
