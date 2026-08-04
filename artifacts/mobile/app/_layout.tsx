import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from "@expo-google-fonts/cairo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AutoExportManager } from "@/components/AutoExportManager";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LockScreen } from "@/components/LockScreen";
import { NotificationManager } from "@/components/NotificationManager";
import { AppProvider } from "@/context/AppContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { SecurityProvider, useSecurity } from "@/context/SecurityContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="report"        options={{ headerShown: false }} />
      <Stack.Screen name="transactions"  options={{ headerShown: false, animation: "slide_from_right" }} />
    </Stack>
  );
}

// Renders the lock screen on top of everything when the app is locked
function SecurityGate({ children }: { children: React.ReactNode }) {
  const { isLocked } = useSecurity();
  return (
    <View style={{ flex: 1 }}>
      {children}
      {isLocked && <LockScreen />}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AppProvider>
              <SecurityProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <SecurityGate>
                      <RootLayoutNav />
                      <NotificationManager />
                      <AutoExportManager />
                    </SecurityGate>
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </SecurityProvider>
            </AppProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
