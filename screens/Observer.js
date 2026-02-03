import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Modal,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWalk } from '../context/WalkContext';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, UrlTile } from '../components/CustomMapView';

const { width, height } = Dimensions.get('window');

const UPDATE_MS = 4000;
const NO_MOVE_WINDOW_MS = 30000; // 30 seconds (30,000ms) of no movement triggers popup
const NO_MOVE_DISTANCE_M = 10;
const CONN_LOST_MS = 15000;
const MIN_DISTANCE_THRESHOLD = 5; // Filter out GPS jitter/drift less than 5m
const MAP_ZOOM_LEVEL = 0.012; // Standard zoom level

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
  const mapRef = useRef(null);

  // Safety Check States
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [safetyCountdown, setSafetyCountdown] = useState(10);
  const safetyTimerRef = useRef(null);
  const lastMoveTimeRef = useRef(Date.now());
  const lastMovePosRef = useRef(null);

  const contactParam = route?.params?.contact;
  const contactName = session?.contact?.name || contactParam?.name || 'Contact';

  const [observingStarted, setObservingStarted] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const simIntervalRef = useRef(null);
  const simPosRef = useRef(null);
  const tickRef = useRef(0);
  const durationIntervalRef = useRef(null);
  const locationsRef = useRef(locations);

  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  // Process new location with drift filtering and auto-center
  const processNewLocation = useCallback((newLoc) => {
    // 1. Update No-Movement Tracker (Always check even if point is 'drift')
    if (!lastMovePosRef.current) {
      lastMovePosRef.current = { lat: newLoc.lat, lng: newLoc.lng };
      lastMoveTimeRef.current = Date.now();
    } else {
      const distFromStart = haversine(lastMovePosRef.current, newLoc);
      if (distFromStart > NO_MOVE_DISTANCE_M) {
        lastMovePosRef.current = { lat: newLoc.lat, lng: newLoc.lng };
        lastMoveTimeRef.current = Date.now(); // Reset stay timer
      }
    }

    // 2. Handle distance and path updates
    const lastLoc = locations[locations.length - 1];

    if (lastLoc) {
      const moveDist = haversine(lastLoc, newLoc);

      // Filter drift: Only update trail if movement is significant 
      // AND we have a positive speed OR the distance jump is high enough to bypass jitter
      const isSignificantMove = moveDist > MIN_DISTANCE_THRESHOLD && (newLoc.speed > 0.3 || moveDist > 12);

      if (isSignificantMove && !showSafetyModal) {
        setDistance((d) => d + moveDist);
        setTimeout(() => pushLocation(newLoc), 0);

        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: newLoc.lat,
            longitude: newLoc.lng,
            latitudeDelta: MAP_ZOOM_LEVEL,
            longitudeDelta: MAP_ZOOM_LEVEL,
          }, 1000);
        }
      }
    } else {
      setTimeout(() => pushLocation(newLoc), 0);
    }
  }, [locations, pushLocation, showSafetyModal]);

  const setLocationsRef = useRef(null);
  useEffect(() => {
    setLocationsRef.current = (cb) => cb(locations);
  }, [locations]);

  const performEmergencyAction = useCallback(async () => {
    if (helpSent) return; // Prevent duplicate sends

    const locs = locationsRef.current;
    if (!locs || locs.length === 0) {
      Alert.alert('Error', 'Unable to get location for SOS.');
      return;
    }
    const current = locs[locs.length - 1];

    const recipientPhone = session?.contact?.phone || contactParam?.phone;
    if (!recipientPhone) {
      Alert.alert('Error', 'No phone number for trusted contact.');
      return;
    }

    setHelpSent(true); // Mark as sent immediately

    try {
      const apiToken = process.env.EXPO_PUBLIC_TEXTLK_API_TOKEN;
      const senderId = process.env.EXPO_PUBLIC_TEXTLK_SENDER_ID;
      const message = `EMERGENCY ALERT! SafeWalk user stopped moving and has not responded.
Location: ${current.lat.toFixed(6)}, ${current.lng.toFixed(6)}
View: https://www.google.com/maps?q=${current.lat},${current.lng}`;

      await fetch('https://app.text.lk/api/v3/sms/send', {
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
      setTimeout(() => setAlert('emergency', 'SOS alert sent to contact.', true), 0);
      Alert.alert('SOS Sent', 'An emergency message has been sent to your trusted contact.');
    } catch (error) {
      console.log('Auto SOS failed', error);
    }
  }, [session?.contact?.phone, contactParam?.phone, setAlert, helpSent]);

  const autoSendEmergency = useCallback(async () => {
    setShowSafetyModal(false);
    setTimeout(() => setAlert('noResponse', 'Automatic SOS triggered due to no response.', true), 0);
    await performEmergencyAction();
  }, [setAlert, performEmergencyAction]);

  const triggerSafetyCheck = useCallback(() => {
    setShowSafetyModal(true);
    setSafetyCountdown(10);

    if (safetyTimerRef.current) clearInterval(safetyTimerRef.current);

    safetyTimerRef.current = setInterval(() => {
      setSafetyCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(safetyTimerRef.current);
          autoSendEmergency();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [autoSendEmergency]);

  const handleSafetyResponse = useCallback((isSafe) => {
    if (safetyTimerRef.current) clearInterval(safetyTimerRef.current);
    setShowSafetyModal(false);

    if (isSafe) {
      lastMoveTimeRef.current = Date.now(); // Reset stay timer
      setTimeout(() => setAlert('userSafe', 'Safety check confirmed: User is safe.', false), 0);
    } else {
      Alert.alert('Sending Help', 'Sending emergency SMS to your contact...');
      performEmergencyAction();
    }
  }, [setAlert, performEmergencyAction]);

  // Refs for stable callbacks
  const processNewLocationRef = useRef(null);
  const performEmergencyActionRef = useRef(null);

  useEffect(() => {
    processNewLocationRef.current = processNewLocation;
    performEmergencyActionRef.current = performEmergencyAction;
  }, [processNewLocation, performEmergencyAction]);
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status);
      if (status !== 'granted') return;

      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: UPDATE_MS, distanceInterval: 3 },
        (loc) => {
          const newLoc = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            speed: loc.coords.speed ?? 0,
            accuracy: loc.coords.accuracy,
            ts: Date.now(),
          };
          // Wrap in timeout to ensure update happens outside the sync watch cycle
          setTimeout(() => {
            processNewLocationRef.current(newLoc);
            setAlert('connLost', 'Connection lost.', false);
          }, 0);
        }
      );
      watchRef.current = sub;
    })();

    return () => {
      if (watchRef.current && typeof watchRef.current.remove === 'function') {
        watchRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (session && !observingStarted) {
      setObservingStarted(true);
    }
  }, [session, observingStarted]);

  useEffect(() => {
    if (observingStarted) return;
    if (session || contactParam) {
      startSimulatedWalk();
    }
  }, [session, contactParam, observingStarted]);

  // Duration timer
  useEffect(() => {
    if (observingStarted) {
      durationIntervalRef.current = setInterval(() => {
        if (session?.startedAt) {
          const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
          setDuration(elapsed > 0 ? elapsed : 0);
        } else {
          setDuration((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [observingStarted]);

  // Stop simulation if real GPS is detected
  useEffect(() => {
    const lastLoc = locations[locations.length - 1];
    if (lastLoc && !lastLoc.isSim && simIntervalRef.current) {
      console.log('Real GPS detected in history, stopping simulation');
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  }, [locations]);





  // No Movement Detection Timer (Checks every 2 seconds)
  useEffect(() => {
    if (!observingStarted) return;

    const safetyCheckInterval = setInterval(() => {
      if (showSafetyModal) return;

      const now = Date.now();
      const stayDuration = now - lastMoveTimeRef.current;

      if (stayDuration > NO_MOVE_WINDOW_MS) {
        triggerSafetyCheck();
      }
    }, 2000);

    return () => clearInterval(safetyCheckInterval);
  }, [observingStarted, showSafetyModal, triggerSafetyCheck]);



  async function startSimulatedWalk() {
    // On native, we prefer real GPS. Only start simulation if no real signal received yet
    if (simIntervalRef.current || (Platform.OS !== 'web' && locations.length > 0)) return;

    // Try to get actual current location to start simulation from there
    let startPos = { lat: 37.7749, lng: -122.4194 }; // Default SF
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (current) {
        startPos = { lat: current.coords.latitude, lng: current.coords.longitude };
      }
    } catch (e) {
      console.log('Using default location for simulation');
    }

    if (!session) {
      // Small delay to ensure session starts outside of current effect cycle
      setTimeout(() => {
        start(contactParam || { id: `sim-${Date.now()}`, name: contactName }, {
          lat: simPosRef.current.lat,
          lng: simPosRef.current.lng,
          speed: 0,
          accuracy: 5,
          ts: Date.now(),
          isSim: true
        });

        // These context updates must also happen outside the sync effect cycle
        pushLocation({
          lat: simPosRef.current.lat,
          lng: simPosRef.current.lng,
          speed: 0,
          accuracy: 5,
          ts: Date.now(),
          isSim: true,
        });

        setAlert('started', `Walk started with ${contactName}.`, false);
      }, 0);
    }
    setObservingStarted(true);

    const last = locations && locations.length ? locations[locations.length - 1] : null;
    simPosRef.current = last ? { lat: last.lat, lng: last.lng } : startPos;

    simIntervalRef.current = setInterval(() => {
      tickRef.current += 1;
      const t = tickRef.current;
      const speed = 1.4;

      // Removed automatic movement increments to allow testing stationary alerts
      // const deltaLat = (speed / 111320) * (Math.random() * 0.8 + 0.6);
      // const deltaLng = (speed / (111320 * Math.cos((simPosRef.current.lat * Math.PI) / 180))) * (Math.random() * 0.8 + 0.6);
      // simPosRef.current.lat += deltaLat;
      // simPosRef.current.lng += deltaLng;

      processNewLocationRef.current({
        lat: simPosRef.current.lat,
        lng: simPosRef.current.lng,
        speed: 0,
        accuracy: 5,
        ts: Date.now(),
        isSim: true,
      });

      if (t === 8) {
        setAlert('noMove', 'No movement for 30 seconds.', true);
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
          onPress: () => performEmergencyActionRef.current(),
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

  const fitView = () => {
    if (mapRef.current && locations.length > 0) {
      mapRef.current.fitToCoordinates(
        locations.map(loc => ({ latitude: loc.lat, longitude: loc.lng })),
        {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        }
      );
    }
  };

  const handleCall = () => {
    const phone = session?.contact?.phone || contactParam?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Error', 'Unable to make call. Please check your phone app.');
      });
    } else {
      Alert.alert('Error', 'No phone number available for this contact.');
    }
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
              <Text style={styles.headerTitle}>Safe Walk Session</Text>
              <Text style={styles.headerSubtitle}>with {contactName}</Text>
            </View>

            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>
                {contactName?.charAt(0)?.toUpperCase() || 'C'}
              </Text>
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
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.durationCard]}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#3B82F6" />
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, styles.durationText]}>{formatDuration(duration)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.distanceCard]}>
            <MaterialCommunityIcons name="map-marker-distance" size={20} color="#10B981" />
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, styles.distanceText]}>{formatDistance(distance)}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.pointsCard]}>
            <MaterialCommunityIcons name="map-marker-multiple" size={20} color="#8B5CF6" />
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, styles.pointsText]}>{locations.length}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>
        </View>

        {/* Local Map View (Native Only) */}
        <View style={styles.mapContainer}>
          {currentLocation ? (
            <>
              <MapView
                ref={mapRef}
                style={styles.map}
                mapType="none"
                showsUserLocation={Platform.OS !== 'web'}
                initialRegion={{
                  latitude: currentLocation.lat,
                  longitude: currentLocation.lng,
                  latitudeDelta: 0.015,
                  longitudeDelta: 0.015,
                }}
              >
                {Platform.OS !== 'web' && (
                  <UrlTile
                    urlTemplate={`https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY}`}
                    maximumZ={20}
                    flipY={false}
                    tileSize={256}
                  />
                )}
                {locations.length > 0 && (
                  <Marker
                    coordinate={{
                      latitude: locations[0].lat,
                      longitude: locations[0].lng,
                    }}
                    title="Start"
                    pinColor="#10B981"
                    zIndex={10}
                    tracksViewChanges={false}
                  />
                )}
                <Marker
                  coordinate={{
                    latitude: currentLocation.lat,
                    longitude: currentLocation.lng,
                  }}
                  title="My Location"
                  description="You are here"
                  zIndex={20}
                  tracksViewChanges={false}
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

              {/* Floating Fit View Button */}
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.fitButton}
                  onPress={fitView}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="arrow-expand-all" size={20} color="#374151" />
                </TouchableOpacity>
              )}
              <View style={styles.osmAttribution}>
                <Text style={styles.osmAttributionText}>© LocationIQ | OpenStreetMap</Text>
              </View>
            </>
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

      {/* Safety Check Modal */}
      <Modal
        visible={showSafetyModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.safetyModalContent}>
            <View style={styles.safetyIconContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
            </View>
            <Text style={styles.safetyTitle}>Safety Check</Text>
            <Text style={styles.safetyMessage}>
              You haven't moved for a while. Are you okay?
            </Text>
            <Text style={styles.safetyTimer}>
              Automatic SOS in <Text style={styles.timerCount}>{safetyCountdown}s</Text>
            </Text>

            <View style={styles.safetyActions}>
              <TouchableOpacity
                style={[styles.safetyButton, styles.safeButton]}
                onPress={() => handleSafetyResponse(true)}
              >
                <Text style={styles.safeButtonText}>I'm Safe</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.safetyButton, styles.issueButton]}
                onPress={() => handleSafetyResponse(false)}
              >
                <Text style={styles.issueButtonText}>I Need Help</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Action Buttons (Fixed Footer) */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.emergencyButton, helpSent && styles.emergencyButtonDisabled]}
          onPress={handleEmergency}
          activeOpacity={0.8}
          disabled={helpSent}
        >
          <LinearGradient
            colors={helpSent ? ['#9CA3AF', '#6B7280'] : ['#EF4444', '#991B1B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emergencyButtonGradient}
          >
            <MaterialCommunityIcons
              name={helpSent ? "check-circle-outline" : "alert-octagon"}
              size={20}
              color="#fff"
            />
            <Text style={styles.emergencyButtonText}>{helpSent ? 'HELP SENT' : 'SOS'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.callButton}
          onPress={handleCall}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.callButtonGradient}
          >
            <MaterialCommunityIcons name="phone" size={20} color="#fff" />
            <Text style={styles.callButtonText}>Call</Text>
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
            <MaterialCommunityIcons name="stop-circle" size={20} color="#fff" />
            <Text style={styles.endButtonText}>End</Text>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginTop: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  durationCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  distanceCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#D1FAE5',
  },
  pointsCard: {
    backgroundColor: '#F5F3FF',
    borderColor: '#EDE9FE',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  durationText: {
    color: '#1E40AF',
  },
  distanceText: {
    color: '#065F46',
  },
  pointsText: {
    color: '#5B21B6',
  },
  statLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 1,
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
    height: 380, // Slightly reduced height for better balance
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
    // Add shadow to make the lifted footer look premium
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20,
  },
  emergencyButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emergencyButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 0,
    opacity: 0.8,
  },
  emergencyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  emergencyButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  callButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  callButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  endButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  endButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  endButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  osmAttribution: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: 4,
  },
  fitButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  osmAttributionText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  safetyModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  safetyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  safetyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  safetyMessage: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  safetyTimer: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  timerCount: {
    color: '#EF4444',
    fontWeight: '800',
  },
  safetyActions: {
    width: '100%',
    gap: 12,
  },
  safetyButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  safeButton: {
    backgroundColor: '#10B981',
  },
  issueButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  safeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  issueButtonText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '700',
  },
});
