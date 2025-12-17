import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { useWalk } from '../context/WalkContext';
import { theme } from '../theme';
import * as Location from 'expo-location';

const UPDATE_MS = 4000;
const NO_MOVE_WINDOW_MS = 120000;
const NO_MOVE_DISTANCE_M = 10;
const CONN_LOST_MS = 15000;

function haversine(a, b) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const A = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));
}

export default function Observer({ navigation, route }) {
  const { session, locations = [], alerts = [], pushLocation, setAlert, end, lastUpdateRef, start } = useWalk();
  const [permission, setPermission] = useState(null);
  const watchRef = useRef(null);

  // support contact passed via navigation (when tapping a contact)
  const contactParam = route?.params?.contact;
  const contactName = session?.contact?.name || contactParam?.name || 'Contact';

  // New state/refs for simulation
  const [observingStarted, setObservingStarted] = useState(false);
  const promptedRef = useRef(false);
  const simIntervalRef = useRef(null);
  const simPosRef = useRef(null);
  const tickRef = useRef(0);
  const alertTimeout1Ref = useRef(null);
  const alertTimeout2Ref = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status);
      if (status !== 'granted') return;

      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: UPDATE_MS, distanceInterval: 3 },
        (loc) => {
          pushLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            speed: loc.coords.speed ?? 0,
            accuracy: loc.coords.accuracy,
            ts: Date.now(),
          });
          setAlert('connLost', 'Connection lost.', false);
        }
      );
      watchRef.current = sub;
    })();

    return () => {
      if (watchRef.current) watchRef.current.remove();
    };
  }, []);

  // Prompt once when screen opens and there's either an active session OR a contact param
useEffect(() => {
  if (observingStarted) return;
  if (session || contactParam) {
    startSimulatedWalk();
  }
}, [session, contactParam]);


  function startSimulatedWalk() {
    if (observingStarted) return;
    // ensure we have a session in the store so lifecycle/end works
    if (!session) {
      start(contactParam || { id: `sim-${Date.now()}`, name: contactName });
    }
    setObservingStarted(true);

    // initialize starting position from last known location if available
    const last = locations && locations.length ? locations[locations.length - 1] : null;
    simPosRef.current = last ? { lat: last.lat, lng: last.lng } : { lat: 37.7749, lng: -122.4194 }; // default SF

    // immediately push one point so UI shows something
    pushLocation({
      lat: simPosRef.current.lat,
      lng: simPosRef.current.lng,
      speed: 0,
      accuracy: 5,
      ts: Date.now(),
    });

    setAlert('started', `Walk started (simulated) with ${contactName}.`, false);

    simIntervalRef.current = setInterval(() => {
      tickRef.current += 1;
      // small consistent movement + jitter
      const jitterLat = (Math.random() - 0.5) * 0.00012;
      const jitterLng = (Math.random() - 0.5) * 0.00012;
      simPosRef.current.lat += 0.00008 + jitterLat;
      simPosRef.current.lng += 0.00006 + jitterLng;

      const speed = +(Math.random() * 1.2).toFixed(2);

      pushLocation({
        lat: simPosRef.current.lat,
        lng: simPosRef.current.lng,
        speed,
        accuracy: 5,
        ts: Date.now(),
      });
    }, UPDATE_MS);

    alertTimeout1Ref.current = setTimeout(() => {
      setAlert('suddenStop', 'Sudden stop detected', true);
      alertTimeout2Ref.current = setTimeout(() => {
        setAlert('noMove1m', 'No movement for 1 minute', true);
      }, 60000);
    }, 30000);
  }

  // cleanup interval when leaving component or when walk ends
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      if (alertTimeout1Ref.current) {
        clearTimeout(alertTimeout1Ref.current);
        alertTimeout1Ref.current = null;
      }
      if (alertTimeout2Ref.current) {
        clearTimeout(alertTimeout2Ref.current);
        alertTimeout2Ref.current = null;
      }
      if (watchRef.current && watchRef.current.remove) {
        try { watchRef.current.remove(); } catch (e) {}
      }
    };
  }, []);

  // If there's neither an active session nor a contact param, show no-session UI
  if (!session && !contactParam) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No active session</Text>
        <TouchableOpacity style={styles.primary} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const last = locations.length ? locations[locations.length - 1] : null;
  const latForPreview = last ? last.lat : 37.7749;
  const lngForPreview = last ? last.lng : -122.4194;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
        Observer • {contactName}
      </Text>

      <View style={{ height: 260, borderRadius: 10, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border }}>
        {Platform.OS === 'web' ? (
          <View style={{ flex: 1, backgroundColor: '#eef2f7' }}>
            {(() => {
              const delta = 0.01;
              const bbox = `${lngForPreview - delta},${latForPreview - delta},${lngForPreview + delta},${latForPreview + delta}`;
              const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latForPreview},${lngForPreview}`;
              return (
                <View style={{ flex: 1, width: '100%', height: '100%' }}>
                  <iframe title="map-preview" src={src} style={{ border: 0, width: '100%', height: '100%' }} />
                </View>
              );
            })()}
          </View>
        ) : (
          (() => {
            const { MapView, Marker } = require('expo-maps');
            return (
              <MapView
                style={{ flex: 1 }}
                initialCameraPosition={{
                  center: {
                    latitude: latForPreview,
                    longitude: lngForPreview,
                  },
                  zoom: 14,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: latForPreview,
                    longitude: lngForPreview,
                  }}
                  title={contactName}
                  description={last ? `Speed ${last.speed ?? 0}` : 'Simulated position'}
                />
              </MapView>
            );
          })()
        )}
      </View>

      <View style={styles.infoBox}>
        <Text>Status: {session?.status || 'simulated'}</Text>
        <Text>Points collected: {locations.length}</Text>
        <Text>
          Last location: {last ? `${last.lat.toFixed(5)}, ${last.lng.toFixed(5)}` : '—'}
        </Text>
        <Text>Mode: {observingStarted ? 'Simulating location (started)' : 'Idle'}</Text>
      </View>

      {!!alerts.length && (
        <View style={[styles.infoBox, { borderColor: '#fecaca', borderWidth: 1 }]}>
          {alerts
            .slice()
            .sort((a, b) => a.ts - b.ts)
            .map((a) => (
              <Text key={a.type} style={{ color: 'red', fontWeight: '700', marginBottom: 4 }}>
                {a.message}
              </Text>
            ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.primary, { marginTop: 20 }]}
        onPress={() => {
          // End simulated walk and go back
          if (simIntervalRef.current) {
            clearInterval(simIntervalRef.current);
            simIntervalRef.current = null;
          }
          if (alertTimeout1Ref.current) {
            clearTimeout(alertTimeout1Ref.current);
            alertTimeout1Ref.current = null;
          }
          if (alertTimeout2Ref.current) {
            clearTimeout(alertTimeout2Ref.current);
            alertTimeout2Ref.current = null;
          }
          if (session) end();
          navigation.navigate('Dashboard');
        }}
      >
        <Text style={styles.primaryText}>End Walk</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  primary: { backgroundColor: theme.colors.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  infoBox: { backgroundColor: theme.colors.surface, padding: 12, borderRadius: 8, marginVertical: 10 },
});
