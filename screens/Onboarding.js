import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Track Your Walks in Real Time',
    description: 'Start secure walk sessions and let trusted contacts monitor your journey for added peace of mind.',
    icon: 'map-marker-radius',
    colors: ['#3B82F6', '#2563EB'],
    visual: 'tracking'
  },
  {
    id: '2',
    title: 'Stay Connected with Trusted Contacts',
    description: 'Instantly notify trusted contacts during emergencies and keep your loved ones informed.',
    icon: 'account-group',
    colors: ['#06B6D4', '#0891B2'],
    visual: 'contacts'
  },
  {
    id: '3',
    title: 'Powerful Safety Management',
    description: 'Manage sessions, monitor activity, and securely control your personal safety data.',
    icon: 'shield-check',
    colors: ['#2563EB', '#06B6D4'],
    visual: 'management'
  },
];

const Onboarding = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef(null);

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    setCurrentIndex(viewableItems[0].index);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      navigation.replace('SignIn');
    }
  };

  const renderVisual = (type) => {
    switch (type) {
      case 'tracking':
        return (
          <View style={styles.visualContainer}>
            <View style={styles.trackingCard}>
              <View style={styles.mapGrid}>
                {[...Array(20)].map((_, i) => (
                  <View key={i} style={styles.gridLine} />
                ))}
              </View>
              <MaterialCommunityIcons name="account-marker" size={80} color="#3B82F6" />
              <View style={styles.trackingStatus}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active Session: Live tracking enabled</Text>
              </View>
            </View>
          </View>
        );
      case 'contacts':
        return (
          <View style={styles.visualContainer}>
            <View style={styles.shieldPulseContainer}>
              <View style={styles.pulseCircle} />
              <View style={[styles.pulseCircle, { animationDelay: '1s' }]} />
              <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.shieldCircle}>
                <MaterialCommunityIcons name="shield-alert" size={40} color="#fff" />
              </LinearGradient>
            </View>
            <View style={[styles.contactBubble, { top: 40, left: 20 }]}>
              <MaterialCommunityIcons name="account" size={20} color="#fff" />
              <View>
                <Text style={styles.bubbleName}>Mom</Text>
                <Text style={styles.bubbleStatus}>TRUSTED</Text>
              </View>
            </View>
            <View style={[styles.contactBubble, { bottom: 40, right: 20 }]}>
              <MaterialCommunityIcons name="account-group" size={20} color="#fff" />
              <View>
                <Text style={styles.bubbleName}>Emergency Group</Text>
                <Text style={styles.bubbleStatus}>INFORMED</Text>
              </View>
            </View>
          </View>
        );
      case 'management':
        return (
          <View style={styles.visualContainer}>
            <View style={styles.dashboardCard}>
              <View style={styles.dashHeader}>
                <MaterialCommunityIcons name="chart-line" size={24} color="#06B6D4" />
                <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
              </View>
              <Text style={styles.dashLabel}>SAFETY INDEX</Text>
              <Text style={styles.dashValue}>98.4%</Text>
              <View style={styles.dashProgress}><View style={styles.dashFill} /></View>
              <View style={styles.stealthRow}>
                <MaterialCommunityIcons name="eye-off" size={20} color="#94A3B8" />
                <Text style={styles.stealthText}>Stealth Mode</Text>
                <View style={styles.switch}><View style={styles.switchKnob} /></View>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.slide}>
      <View style={styles.header}>
        <Text style={styles.headerBrand}>SafeWalk</Text>
        <TouchableOpacity onPress={() => navigation.replace('SignIn')}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.illustrationContainer}>
        {renderVisual(item.visual)}
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <FlatList
        data={slides}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
      />

      <View style={styles.footer}>
        <View style={styles.paginator}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [10, 30, 10],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return <Animated.View style={[styles.dot, { width: dotWidth, opacity }]} key={i} />;
          })}
        </View>

        <TouchableOpacity style={styles.button} onPress={scrollTo} activeOpacity={0.8}>
          <LinearGradient
            colors={slides[currentIndex].colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <MaterialCommunityIcons
              name={currentIndex === slides.length - 1 ? 'shield-check' : 'arrow-right'}
              size={20}
              color="#fff"
              style={{ marginLeft: 10 }}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  slide: {
    width,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  headerBrand: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  skipText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
  },
  visualContainer: {
    width: width * 0.8,
    height: width * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackingCard: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 24,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridLine: {
    width: '25%',
    height: '25%',
    borderWidth: 0.5,
    borderColor: '#3B82F6',
  },
  trackingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#06B6D4',
    marginRight: 10,
  },
  statusText: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  shieldPulseContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  shieldCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
  contactBubble: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    padding: 12,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bubbleName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bubbleStatus: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dashboardCard: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  liveBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveText: {
    color: '#06B6D4',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dashLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  dashValue: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dashProgress: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    marginBottom: 30,
  },
  dashFill: {
    width: '98%',
    height: '100%',
    backgroundColor: '#06B6D4',
    borderRadius: 3,
  },
  stealthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  stealthText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 14,
  },
  switch: {
    width: 44,
    height: 24,
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    padding: 2,
    alignItems: 'flex-end',
  },
  switchKnob: {
    width: 20,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  paginator: {
    flexDirection: 'row',
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginHorizontal: 8,
  },
  button: {
    height: 60,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Onboarding;
