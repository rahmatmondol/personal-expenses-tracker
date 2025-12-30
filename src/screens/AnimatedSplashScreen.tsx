import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

const { width } = Dimensions.get('window');

interface Props {
    onAnimationFinish?: () => void;
}

export const AnimatedSplashScreen: React.FC<Props> = ({ onAnimationFinish }) => {
    const theme = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.5)).current;
    const textAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Sequence of animations
        Animated.sequence([
            // 1. Fade in and Scale up logo
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]),
            // 2. Fade in Text
            Animated.timing(textAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            // 3. Wait a bit
            Animated.delay(500),
        ]).start(() => {
            if (onAnimationFinish) {
                onAnimationFinish();
            }
        });
    }, []);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryContainer]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Animated.View 
                    style={[
                        styles.logoContainer, 
                        { 
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }] 
                        }
                    ]}
                >
                    <View style={styles.iconCircle}>
                        <Ionicons name="wallet" size={80} color={theme.colors.primary} />
                    </View>
                </Animated.View>

                <Animated.View style={{ opacity: textAnim, marginTop: 20 }}>
                    <Text style={styles.appName}>WalletCare</Text>
                    <Text style={styles.tagline}>Your Personal Finance Guardian</Text>
                </Animated.View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    iconCircle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginTop: 20,
        letterSpacing: 1,
    },
    tagline: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 5,
    }
});
