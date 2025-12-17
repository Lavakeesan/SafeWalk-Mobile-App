import React, { createContext, useContext, useMemo, useRef, useState } from 'react';

// Simple in-app store for session/locations/alerts
const WalkContext = createContext(null);

export function WalkProvider({ children }) {
  const [session, setSession] = useState(null); // { id, contact, status, startedAt, endedAt }
  const [locations, setLocations] = useState([]); // [{lat,lng,speed,accuracy,ts}]
  const [alerts, setAlerts] = useState([]); // [{type,message,active,ts}]
  const [history, setHistory] = useState([]); // array of past sessions
  const lastUpdateRef = useRef(0);

  // contacts shown across the app (Dashboard, Trusted Contacts)
  const [contacts, setContacts] = useState([
    { id: 'sarah', name: 'Sarah' },
    { id: 'michele', name: 'Michele' },
    { id: 'chen', name: 'Chen' },
  ]);

  const addContact = (contact) => {
    const newContact = {
      id: contact?.id || `c-${Date.now()}`,
      name: contact?.name || 'Unnamed',
      email: contact?.email || '',
      phone: contact?.phone || '',
    };
    setContacts((prev) => [...prev, newContact]);
    return newContact;
  };

  const removeContact = (id) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const start = (contact) => {
    const id = Date.now().toString();
    setSession({ id, contact, status: 'active', startedAt: Date.now() });
    setLocations([]);
    setAlerts([]);
    lastUpdateRef.current = 0;
  };

  const end = () => {
    setSession((s) => {
      if (!s) return s;
      const ended = { ...s, status: 'ended', endedAt: Date.now() };
      setHistory((prev) => [...prev, ended]);
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
    () => ({ session, locations, alerts, history, start, end, pushLocation, setAlert, lastUpdateRef, contacts, addContact, removeContact }),
    [session, locations, alerts, history, contacts]
  );

  return <WalkContext.Provider value={value}>{children}</WalkContext.Provider>;
}

export const useWalk = () => {
  const ctx = useContext(WalkContext);
  if (!ctx) throw new Error('useWalk must be used within WalkProvider');
  return ctx;
};
