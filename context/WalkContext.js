import React, { createContext, useContext, useMemo, useRef, useState, useEffect, useCallback } from 'react';
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
  const loadUserData = useCallback(async () => {
    if (!user?.uid) return;
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
  }, [user?.uid]);

  /**
   * Add a new trusted contact
   * Saves to Firebase and updates local state
   */
  const addContact = useCallback(async (contact) => {
    const newContact = {
      id: contact?.id || `c-${Date.now()}`,
      name: contact?.name || 'Unnamed',
      email: contact?.email || '',
      phone: contact?.phone || '',
    };

    setContacts((prev) => [...prev, newContact]);

    if (user?.uid) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          trustedContacts: arrayUnion(newContact)
        }, { merge: true });
      } catch (error) {
        console.error('Error adding contact to Firebase:', error);
      }
    }

    return newContact;
  }, [user?.uid]);

  /**
   * Remove a trusted contact
   * Removes from Firebase and updates local state
   */
  const removeContact = useCallback(async (id) => {
    const contactToRemove = contacts.find((c) => c.id === id);
    setContacts((prev) => prev.filter((c) => c.id !== id));

    if (user?.uid && contactToRemove) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          trustedContacts: arrayRemove(contactToRemove)
        });
      } catch (error) {
        console.error('Error removing contact from Firebase:', error);
      }
    }
  }, [user?.uid, contacts]);

  /**
   * Update an existing trusted contact
   */
  const updateContact = useCallback(async (updatedContact) => {
    setContacts((prev) => {
      const newContacts = prev.map((c) => (c.id === updatedContact.id ? updatedContact : c));

      // Sync with Firebase
      if (user?.uid) {
        setDoc(doc(db, 'users', user.uid), {
          trustedContacts: newContacts
        }, { merge: true }).catch(err => console.error('Error updating contacts in Firebase:', err));
      }

      return newContacts;
    });
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

    const ended = {
      ...session,
      status: 'ended',
      endedAt: Date.now(),
      startLocation: startLoc,
      endLocation: endLoc
    };

    // Update states
    setSession(ended);
    setHistory((prev) => [...prev, ended]);

    if (user?.uid) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          walkSessions: arrayUnion(ended)
        }, { merge: true });
        console.log('Session saved to Firebase successfully');
      } catch (error) {
        console.error('Error saving session to Firebase:', error);
      }
    }
    return ended;
  }, [user?.uid, session, locations]);

  /**
   * Delete a session from history
   */
  const deleteHistorySession = useCallback(async (id) => {
    const sessionToDelete = history.find((s) => s.id === id);
    setHistory((prev) => prev.filter((s) => s.id !== id));

    if (user?.uid && sessionToDelete) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          walkSessions: arrayRemove(sessionToDelete)
        });
        console.log('Session removed from Firebase history');
      } catch (error) {
        console.error('Error removing session from Firebase:', error);
      }
    }
  }, [user?.uid, history]);

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
