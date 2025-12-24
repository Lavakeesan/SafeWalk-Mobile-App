import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWalk } from '../context/WalkContext';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

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
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const watchRef = useRef(null);

  const contactParam = route?.params?.contact;
  const contactName = session?.contact?.name || contactParam?.name || 'Contact';

  const [observingStarted, setObservingStarted] = useState(false);
  const simIntervalRef = useRef(null);
  const simPosRef = useRef(null);
  const tickRef = useRef(0);
  const durationIntervalRef = useRef(null);

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

  useEffect(() => {
    if (observingStarted) return;
    if (session || contactParam) {
      startSimulatedWalk();
    }
  }, [session, contactParam]);

  // Duration timer
  useEffect(() => {
    if (observingStarted) {
      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [observingStarted]);

  // Calculate distance
  useEffect(() => {
    if (locations.length > 1) {
      let totalDistance = 0;
      for (let i = 1; i < locations.length; i++) {
        totalDistance += haversine(locations[i - 1], locations[i]);
      }
      setDistance(totalDistance);
    }
  }, [locations]);

  function startSimulatedWalk() {
    if (observingStarted) return;
    if (!session) {
      start(contactParam || { id: `sim-${Date.now()}`, name: contactName });
    }
    setObservingStarted(true);

    const last = locations && locations.length ? locations[locations.length - 1] : null;
    simPosRef.current = last ? { lat: last.lat, lng: last.lng } : { lat: 37.7749, lng: -122.4194 };

    pushLocation({
      lat: simPosRef.current.lat,
      lng: simPosRef.current.lng,
      speed: 0,
      accuracy: 5,
      ts: Date.now(),
    });

    setAlert('started', `Walk started with ${contactName}.`, false);

    simIntervalRef.current = setInterval(() => {
      tickRef.current += 1;
      const t = tickRef.current;
      const speed = 1.4;
      const deltaLat = (speed / 111320) * (Math.random() * 0.8 + 0.6);
      const deltaLng = (speed / (111320 * Math.cos((simPosRef.current.lat * Math.PI) / 180))) * (Math.random() * 0.8 + 0.6);

      simPosRef.current.lat += deltaLat;
      simPosRef.current.lng += deltaLng;

      pushLocation({
        lat: simPosRef.current.lat,
        lng: simPosRef.current.lng,
        speed: speed + Math.random() * 0.3,
        accuracy: 5 + Math.random() * 3,
        ts: Date.now(),
      });

      if (t === 8) {
        setAlert('suddenStop', 'Sudden stop detected. Are you okay?', true);
      }
      if (t === 15) {
        setAlert('noMove', 'No movement for 1 minute.', true);
      }
    }, UPDATE_MS);
  }

  const handleEmergency = async () => {
    if (!currentLocation) {
      Alert.alert('Wait', 'Acquiring GPS location...');
      return;
    }

    const recipientPhone = session?.contact?.phone || contactParam?.phone;
    if (!recipientPhone) {
      Alert.alert('Error', 'No phone number found for trusted contact.');
      return;
    }

    Alert.alert(
      'Emergency SOS',
      `Send emergency SMS to ${contactName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send NOW',
          style: 'destructive',
          onPress: async () => {
            try {
              const apiToken = process.env.EXPO_PUBLIC_TEXTLK_API_TOKEN;
              const senderId = process.env.EXPO_PUBLIC_TEXTLK_SENDER_ID;
              const message = `EMERGENCY! SafeWalk user is in danger. 
Location: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}
View on maps: https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;

              const response = await fetch('https://app.text.lk/api/v3/sms/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiToken}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({
                  recipient: recipientPhone,
                  sender_id: senderId,
                  message: message,
                }),
              });

              const result = await response.json();

              if (response.ok) {
                Alert.alert('Sent', 'Emergency alert has been sent!');
                setAlert('emergency', 'SOS alert sent to contact.', true);
              } else {
                Alert.alert('SMS Failed', result.message || 'Could not send SMS.');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error. Check connection.');
            }
          },
        },
      ]
    );
  };

  const handleEndWalk = () => {
    Alert.alert(
      'End Walk Session',
      'Are you sure you want to end this walk session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Walk',
          style: 'destructive',
          onPress: () => {
            if (simIntervalRef.current) clearInterval(simIntervalRef.current);
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
            end();
            navigation.goBack();
          },
        },
      ]
    );
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${meters.toFixed(0)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const currentLocation = locations.length > 0 ? locations[locations.length - 1] : null;
  const activeAlerts = alerts.filter((a) => a.active);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header (Fixed) */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={['#4F46E5', '#3730A3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <Text style={styles.headerTitle}>Active Walk</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Contact Info */}
          <View style={styles.contactInfo}>
            <View style={styles.contactAvatar}>
              <Text style={styles.contactAvatarText}>
                {contactName?.charAt(0)?.toUpperCase() || 'C'}
              </Text>
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Walking with</Text>
              <Text style={styles.contactName}>{contactName}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <MaterialCommunityIcons name="clock-outline" size={28} color="#fff" />
              <Text style={styles.statValue}>{formatDuration(duration)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <MaterialCommunityIcons name="map-marker-distance" size={28} color="#fff" />
              <Text style={styles.statValue}>{formatDistance(distance)}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <MaterialCommunityIcons name="map-marker-multiple" size={28} color="#fff" />
              <Text style={styles.statValue}>{locations.length}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Local Map View (Native Only) */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.mapPlaceholder}
            >
              <MaterialCommunityIcons name="web" size={64} color="#9CA3AF" />
              <Text style={styles.mapText}>Map is only available on Mobile</Text>
              {currentLocation && (
                <View style={styles.coordinatesBox}>
                  <Text style={styles.coordinatesText}>
                    📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </Text>
                </View>
              )}
            </LinearGradient>
          ) : currentLocation ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              region={{
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              <Marker
                coordinate={{
                  latitude: currentLocation.lat,
                  longitude: currentLocation.lng,
                }}
                title="My Location"
                description="You are here"
              />

              {locations.length > 1 && (
                <Polyline
                  coordinates={locations.map(loc => ({
                    latitude: loc.lat,
                    longitude: loc.lng
                  }))}
                  strokeColor="#3B82F6"
                  strokeWidth={4}
                />
              )}
            </MapView>
          ) : (
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.mapPlaceholder}
            >
              <MaterialCommunityIcons name="map" size={64} color="#9CA3AF" />
              <Text style={styles.mapText}>Initializing Map...</Text>
            </LinearGradient>
          )}
        </View>

        {/* Alerts */}
        {activeAlerts.length > 0 && (
          <View style={styles.alertsContainer}>
            <Text style={styles.alertsTitle}>⚠️ Safety Alerts</Text>
            {activeAlerts.map((alert, index) => (
              <View key={index} style={styles.alertCard}>
                <View style={styles.alertIcon}>
                  <MaterialCommunityIcons name="alert-circle" size={24} color="#EF4444" />
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.alertTime}>
                    {new Date(alert.ts).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Status Info */}
        <View style={styles.statusContainer}>
          <View style={styles.statusCard}>
            <MaterialCommunityIcons name="shield-check" size={24} color="#10B981" />
            <Text style={styles.statusText}>Session Active</Text>
          </View>
          <View style={styles.statusCard}>
            <MaterialCommunityIcons name="signal" size={24} color="#10B981" />
            <Text style={styles.statusText}>GPS Connected</Text>
          </View>
        </View>

        {/* Recent Locations */}
        {locations.length > 0 && (
          <View style={styles.locationsContainer}>
            <Text style={styles.locationsTitle}>Recent Locations</Text>
            {locations.slice().reverse().slice(0, 5).map((loc, index) => (
              <View key={index} style={styles.locationCard}>
                <MaterialCommunityIcons name="map-marker" size={20} color="#6B7280" />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationCoords}>
                    {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                  </Text>
                  <Text style={styles.locationTime}>
                    {new Date(loc.ts).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.locationSpeed}>
                  {(loc.speed * 3.6).toFixed(1)} km/h
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons (Fixed Footer) */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={handleEmergency}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#EF4444', '#991B1B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emergencyButtonGradient}
          >
            <MaterialCommunityIcons name="alert-octagon" size={24} color="#fff" />
            <Text style={styles.emergencyButtonText}>EMERGENCY</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endButton}
          onPress={handleEndWalk}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#4F46E5', '#3730A3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.endButtonGradient}
          >
            <MaterialCommunityIcons name="stop-circle" size={24} color="#fff" />
            <Text style={styles.endButtonText}>End Walk</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerWrapper: {
    zIndex: 10,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 16,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4F46E5',
  },
  contactDetails: {
    marginLeft: 12,
  },
  contactLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20, // Reduced as we no longer overlap with footer
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  mapContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    height: 300, // Increased height for better visibility
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerHalo: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  coordinatesBox: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  coordinatesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  alertsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  alertsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  alertIcon: {
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#DC2626',
  },
  statusContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  statusCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  locationsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  locationsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationCoords: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  locationTime: {
    fontSize: 11,
    color: '#6B7280',
  },
  locationSpeed: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  emergencyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emergencyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  emergencyButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  endButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  endButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  endButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
