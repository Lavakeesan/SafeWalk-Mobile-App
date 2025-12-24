import React, { createContext, useContext, useState, useRef } from 'react';

const WalkContext = createContext();

export const WalkProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [locations, setLocations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const lastUpdateRef = useRef(Date.now());

  // contacts state (default contacts shown on Dashboard)
  const [contacts, setContacts] = useState([
    { id: 'sarah', name: 'Sarah' },
    { id: 'michele', name: 'Michele' },
    { id: 'chen', name: 'Chen' },
  ]);

  const addContact = (contact) => {
    const newContact = {
      id: contact.id || `c-${Date.now()}`,
      name: contact.name || 'Unnamed',
    };
    setContacts((prev) => [...prev, newContact]);
    return newContact;
  };

  const removeContact = (id) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const start = (contact) => {
    // allow passing an id or an object
    const contactObj =
      typeof contact === 'string'
        ? contacts.find((c) => c.id === contact) || { id: contact, name: contact }
        : contact;
    setSession({ id: `walk-${Date.now()}`, contact: contactObj, status: 'active' });
    setLocations([]);
    setAlerts([]);
    lastUpdateRef.current = Date.now();
  };

  const end = () => setSession(null);

  const pushLocation = (loc) => {
    setLocations((prev) => [...prev, loc]);
    lastUpdateRef.current = Date.now();
  };

  const setAlert = (type, message, active) => {
    setAlerts((prev) => {
      const exists = prev.find((a) => a.type === type);
      if (exists) return prev.map((a) => (a.type === type ? { ...a, active, message } : a));
      return [...prev, { type, message, active }];
    });
  };

  return (
    <WalkContext.Provider
      value={{
        session,
        locations,
        pushLocation,
        setAlert,
        end,
        lastUpdateRef,
        start,
        alerts,
        contacts,
        addContact,
        removeContact,
      }}
    >
      {children}
    </WalkContext.Provider>
  );
};

export const useWalk = () => useContext(WalkContext);
