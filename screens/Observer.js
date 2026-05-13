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
  ActivityIndicator,
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

      {/* Modern Session Header */}
      <View style={styles.sessionHeader}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#F8FAFC" />
        </TouchableOpacity>

        <View style={styles.headerCenterArea}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDotPulse} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <Text style={styles.sessionMainTitle}>Safe Walk Session</Text>
          <Text style={styles.sessionSubTitle}>with {contactName}</Text>
        </View>

        <TouchableOpacity style={styles.headerIconButton}>
          <MaterialCommunityIcons name="radar" size={24} color="#00F2FF" />
        </TouchableOpacity>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBoxCard}>
            <MaterialCommunityIcons name="clock-outline" size={22} color="#00F2FF" />
            <Text style={styles.statBoxValue}>{formatDuration(duration)}</Text>
            <Text style={styles.statBoxLabel}>DURATION</Text>
          </View>
          <View style={styles.statBoxCard}>
            <MaterialCommunityIcons name="vector-polyline" size={22} color="#10B981" />
            <Text style={styles.statBoxValue}>{formatDistance(distance)}</Text>
            <Text style={styles.statBoxLabel}>DISTANCE</Text>
          </View>
          <View style={styles.statBoxCard}>
            <MaterialCommunityIcons name="map-marker-outline" size={22} color="#818CF8" />
            <Text style={styles.statBoxValue}>{locations.length}</Text>
            <Text style={styles.statBoxLabel}>POINTS</Text>
          </View>
        </View>

        {/* Perspective Map Container */}
        <View style={styles.mapPerspectiveWrapper}>
          <View style={styles.mapInnerContainer}>
            {currentLocation ? (
              <MapView
                ref={mapRef}
                style={styles.mapViewInstance}
                mapType="none"
                showsUserLocation={Platform.OS !== 'web'}
                initialRegion={{
                  latitude: currentLocation.lat,
                  longitude: currentLocation.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                {Platform.OS !== 'web' && (
                  <UrlTile
                    urlTemplate={`https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY}`}
                    maximumZ={20}
                  />
                )}
                {locations.length > 1 && (
                  <Polyline
                    coordinates={locations.map(loc => ({ latitude: loc.lat, longitude: loc.lng }))}
                    strokeColor="#2563EB"
                    strokeWidth={4}
                  />
                )}
                <Marker
                  coordinate={{ latitude: currentLocation.lat, longitude: currentLocation.lng }}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.pulsingUserMarker}>
                    <View style={styles.markerInnerDot} />
                  </View>
                </Marker>
              </MapView>
            ) : (
              <View style={styles.mapLoadingState}>
                <ActivityIndicator color="#00F2FF" size="large" />
                <Text style={styles.loadingMapText}>Acquiring signal...</Text>
              </View>
            )}

            {/* Map Overlay Controls */}
            <View style={styles.mapControlsRight}>
              <TouchableOpacity style={styles.mapControlBtn} onPress={fitView}>
                <MaterialCommunityIcons name="fullscreen" size={22} color="#F8FAFC" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapControlBtn}>
                <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            <View style={styles.mapAttributionSmall}>
              <Text style={styles.attrText}>Aegis Maps | Legal</Text>
            </View>
          </View>
        </View>

        {/* Status Indicator Cards */}
        <View style={styles.dualStatusRow}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.02)']}
            style={[styles.statusIndicatorCard, { borderColor: 'rgba(16, 185, 129, 0.4)' }]}
          >
            <View style={styles.statusCheckIcon}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
            </View>
            <View>
              <Text style={styles.statusValueText}>Session Active</Text>
              <Text style={styles.statusLabelText}>GUARDIAN ON</Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(0, 242, 255, 0.1)', 'rgba(0, 242, 255, 0.02)']}
            style={[styles.statusIndicatorCard, { borderColor: 'rgba(0, 242, 255, 0.4)' }]}
          >
            <View style={styles.statusCheckIcon}>
              <MaterialCommunityIcons name="signal-variant" size={20} color="#00F2FF" />
            </View>
            <View>
              <Text style={styles.statusValueText}>GPS Connected</Text>
              <Text style={styles.statusLabelText}>HIGH PRECISION</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Recent Locations List */}
        <View style={styles.recentLocationsSection}>
          <View style={styles.sectionHeaderCompact}>
            <Text style={styles.sectionTitleMain}>Recent Locations</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllTextLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {locations.length > 0 ? (
            locations.slice().reverse().slice(0, 3).map((loc, idx) => (
              <TouchableOpacity key={idx} style={styles.locationListItem}>
                <View style={styles.locIconContainer}>
                  <MaterialCommunityIcons name="crosshairs" size={18} color="#94A3B8" />
                </View>
                <View style={styles.locTextContent}>
                  <Text style={styles.locCoordsText}>{loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}</Text>
                  <Text style={styles.locAddressText}>Point registered {new Date(loc.ts).toLocaleTimeString()}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#475569" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyLocState}>
              <Text style={styles.emptyLocText}>No data points recorded yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* New Bottom Action Suite */}
      <View style={styles.actionFooterSuite}>
        <View style={styles.actionBtnRow}>
          <TouchableOpacity style={styles.actionBtnSos} onPress={handleEmergency}>
            <MaterialCommunityIcons name="asterisk" size={24} color="#fff" />
            <Text style={styles.actionBtnLabel}>SOS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnCall} onPress={handleCall}>
            <MaterialCommunityIcons name="phone-outline" size={24} color="#fff" />
            <Text style={styles.actionBtnLabel}>CALL</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnEnd} onPress={handleEndWalk}>
            <MaterialCommunityIcons name="stop-circle-outline" size={24} color="#fff" />
            <Text style={styles.actionBtnLabel}>END</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#010A1A',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterArea: {
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  liveDotPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sessionMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sessionSubTitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBoxCard: {
    width: (width - 60) / 3,
    backgroundColor: '#0B1526',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 8,
  },
  statBoxLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  mapPerspectiveWrapper: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  mapInnerContainer: {
    height: 320,
    backgroundColor: '#0B1526',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapViewInstance: {
    flex: 1,
  },
  mapLoadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMapText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  mapControlsRight: {
    position: 'absolute',
    top: 20,
    right: 20,
    gap: 12,
  },
  mapControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(1, 10, 26, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapAttributionSmall: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    backgroundColor: 'rgba(1, 10, 26, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  attrText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  pulsingUserMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 242, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00F2FF',
    borderWidth: 2,
    borderColor: '#fff',
  },
  dualStatusRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 32,
  },
  statusIndicatorCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusCheckIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statusValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statusLabelText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '800',
    marginTop: 2,
  },
  recentLocationsSection: {
    paddingHorizontal: 20,
  },
  sectionHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleMain: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  viewAllTextLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  locationListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1526',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  locIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locTextContent: {
    flex: 1,
    marginLeft: 16,
  },
  locCoordsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  locAddressText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emptyLocState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyLocText: {
    color: '#475569',
    fontSize: 14,
  },
  actionFooterSuite: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: 'rgba(1, 10, 26, 0.95)', // Solid semi-transparent fallback
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtnSos: {
    flex: 1,
    backgroundColor: '#EF4444',
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnCall: {
    flex: 1,
    backgroundColor: '#10B981',
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnEnd: {
    flex: 1,
    backgroundColor: '#2563EB',
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 10, 26, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  safetyModalContent: {
    backgroundColor: '#0B1526',
    borderRadius: 32,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  safetyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  safetyTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  safetyMessage: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  safetyTimer: {
    fontSize: 18,
    color: '#F8FAFC',
    fontWeight: '700',
    marginBottom: 32,
  },
  timerCount: {
    color: '#EF4444',
    fontSize: 22,
    fontWeight: '900',
  },
  safetyActions: {
    width: '100%',
    gap: 12,
  },
  safetyButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeButton: {
    backgroundColor: '#10B981',
  },
  safeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  issueButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  issueButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '800',
  },
});
