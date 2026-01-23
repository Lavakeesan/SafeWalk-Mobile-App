import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Dynamically import Leaflet components only on the client side
let LeafletMapContainer, LeafletTileLayer, LeafletMarker, LeafletPolyline;

const SafeLeafletMap = (props) => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // We do this inside useEffect to ensure it only runs on the client
        const loadLeaflet = async () => {
            try {
                // Check if we already have the CSS
                if (!document.getElementById('leaflet-css')) {
                    const link = document.createElement('link');
                    link.id = 'leaflet-css';
                    link.rel = 'stylesheet';
                    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                    document.head.appendChild(link);
                }

                const Leaflet = await import('react-leaflet');
                LeafletMapContainer = Leaflet.MapContainer;
                LeafletTileLayer = Leaflet.TileLayer;
                LeafletMarker = Leaflet.Marker;
                LeafletPolyline = Leaflet.Polyline;

                // Fix for marker icons in Leaflet
                const L = await import('leaflet');
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                });

                setIsLoaded(true);
            } catch (e) {
                console.error('Failed to load Leaflet', e);
            }
        };

        loadLeaflet();
    }, []);

    if (!isLoaded) {
        return (
            <View style={[styles.placeholder, props.style]}>
                <Text>Loading Map...</Text>
            </View>
        );
    }

    const { initialRegion, children, style } = props;

    // Default zoom
    const zoom = 13;

    return (
        <View style={[styles.container, style]}>
            <LeafletMapContainer
                center={[initialRegion.latitude, initialRegion.longitude]}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <LeafletTileLayer
                    attribution='&copy; <a href="https://locationiq.com/">LocationIQ</a> | <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url={`https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY}`}
                />
                {children}
            </LeafletMapContainer>
        </View>
    );
};

export const Marker = ({ coordinate, title }) => {
    if (!LeafletMarker) return null;
    return <LeafletMarker position={[coordinate.latitude, coordinate.longitude]} />;
};

export const Polyline = ({ coordinates, strokeColor, strokeWidth }) => {
    if (!LeafletPolyline) return null;
    return (
        <LeafletPolyline
            positions={coordinates.map(c => [c.latitude, c.longitude])}
            pathOptions={{ color: strokeColor, weight: strokeWidth }}
        />
    );
};

export const UrlTile = () => null;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    placeholder: {
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default SafeLeafletMap;
