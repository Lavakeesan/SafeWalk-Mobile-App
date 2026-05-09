import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const Splash = ({ navigation }) => {
  const progress = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.9);
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        })
      ])
    ).start();

    // Initial entrance and loading
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: 3500,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      })
    ]).start(() => {
      navigation.replace('Onboarding');
    });
  }, []);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.View style={[
        styles.logoSection, 
        { 
          opacity: fadeAnim, 
          transform: [
            { scale: scaleAnim },
            { translateY: translateY }
          ] 
        }
      ]}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoBox}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>
        <Text style={styles.appName}>SafeWalk</Text>
        <Text style={styles.tagline}>Walk Safely. Stay Connected.</Text>
      </Animated.View>

      <View style={styles.loaderSection}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.loaderText}>INITIALIZING SHIELD</Text>
      </View>

      <View style={styles.footer}>
        <MaterialCommunityIcons name="shield-check" size={16} color="#94A3B8" />
        <Text style={styles.footerText}>SECURE END-TO-END CONNECTION</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoWrapper: {
    width: 180,
    height: 180,
    borderRadius: 30,
    backgroundColor: '#fff',
    elevation: 25,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 32,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 18,
    color: '#3B82F6',
    marginTop: 12,
    fontWeight: '600',
  },
  loaderSection: {
    width: '70%',
    alignItems: 'center',
    marginTop: 40,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  loaderText: {
    color: '#94A3B8',
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: '#475569',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '800',
  },
});

export default Splash;



