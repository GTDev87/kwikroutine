import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  Easing,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Slot, usePathname, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import { DMMono_500Medium } from "@expo-google-fonts/dm-mono";
import { StoreProvider, useStore } from "./src/state/store";
import {
  Button,
  C,
  Heading,
  T,
  fonts,
  s,
} from "./src/components/ui";
import { Onboarding } from "./src/screens/Onboarding";
import { listenBilling, refreshBilling } from "./src/services/billing";
import { mergeBilling } from "./src/domain/engine";
import { backTarget } from "./src/navigation";
import { TabIcon, TabId } from "./src/components/TabIcon";
import { LinearGradient } from "expo-linear-gradient";
import { ND, Squish, useReducedMotion } from "./src/components/motion";
const tabs: { id: TabId; title: string }[] = [
  { id: "today", title: "Today" },
  { id: "history", title: "History" },
  { id: "profile", title: "Profile" },
];
function Shell() {
  const { data, update, loaded, error, retry } = useStore();
  const pathname = usePathname();
  const route = pathname === "/" ? "today" : pathname.slice(1);
  const setRoute = (next: string) =>
    router.replace(next === "today" ? "/" : (`/${next}` as any));
  useEffect(() => {
    if (!loaded || !data.profile) return;
    const refresh = () =>
      void refreshBilling()
        .then((info) => {
          if (info) update((d) => mergeBilling(d, info));
        })
        .catch(() => {});
    refresh();
    const unlisten = listenBilling((info) =>
      update((d) => mergeBilling(d, info)),
    );
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      unlisten();
      subscription.remove();
    };
  }, [loaded, !!data.profile, update]);
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (route !== "today") {
        setRoute(backTarget[route] ?? "today");
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [route]);
  if (!loaded)
    return (
      <View style={[s.page, { flex: 1, justifyContent: "center" }]}>
        {error ? (
          <>
            <Heading size={28}>Let’s keep your data safe.</Heading>
            <T>{error}</T>
            <Button title="Try again" onPress={retry} />
          </>
        ) : (
          <ActivityIndicator color={C.accent} />
        )}
      </View>
    );
  const isTab = tabs.some((t) => t.id === route);
  return (
    <>
      {!!error && (
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={{ backgroundColor: C.surface2, padding: 12 }}
        >
          <T style={[s.small, { color: C.danger }]}>{error} Tap to retry.</T>
        </Pressable>
      )}
      {!data.profile ? (
        <Onboarding />
      ) : (
        <>
          <ScreenIn key={pathname} style={{ flex: 1 }}>
            <Slot />
          </ScreenIn>
          {isTab && <TabBar route={route} onSelect={setRoute} />}
        </>
      )}
    </>
  );
}
// Each screen slides up and fades in when the route changes.
function ScreenIn({ children, style }: { children: React.ReactNode; style?: object }) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReducedMotion();
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: reduce ? 1 : 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: ND,
    }).start();
  }, [reduce]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
// Floating pill tab bar; a lime slab glides under the active tab.
function TabBar({ route, onSelect }: { route: string; onSelect: (id: string) => void }) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, tabs.findIndex((t) => t.id === route));
  const x = useRef(new Animated.Value(index)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: index, friction: 7, tension: 80, useNativeDriver: ND }).start();
  }, [index, x]);
  const slot = width / tabs.length;
  return (
    <View style={styles.tabWrap}>
      <View
        style={styles.tabs}
        accessibilityRole="tablist"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width - 12)}
      >
        {width > 0 && (
          <Animated.View
            style={[
              styles.indicator,
              {
                width: slot,
                transform: [
                  { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, slot] }) },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={["#D6FF63", C.accent, C.accentDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
            />
          </Animated.View>
        )}
        {tabs.map((tab) => {
          const on = tab.id === route;
          return (
            <Squish
              key={tab.id}
              accessibilityRole="tab"
              accessibilityLabel={tab.title}
              accessibilityState={{ selected: on }}
              onPress={() => onSelect(tab.id)}
              scaleTo={0.9}
              style={styles.tab}
            >
              <TabIcon id={tab.id} on={on} size={24} color={on ? C.onAccent : undefined} />
              <T
                style={{
                  fontSize: 11,
                  lineHeight: 14,
                  fontFamily: on ? fonts.black : fonts.semibold,
                  color: on ? C.onAccent : C.muted,
                }}
              >
                {tab.title}
              </T>
            </Squish>
          );
        })}
      </View>
    </View>
  );
}
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    DMMono_500Medium,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.outer}>
        <View style={styles.app}>
          {fontsLoaded || fontError ? (
            <StoreProvider>
              <Shell />
            </StoreProvider>
          ) : (
            <ActivityIndicator color={C.accent} style={{ flex: 1 }} />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Platform.OS === "web" ? "#1C1C1E" : C.bg },
  app: {
    flex: 1,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    backgroundColor: C.bg,
  },
  tabWrap: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: C.bg,
  },
  tabs: {
    flexDirection: "row",
    padding: 6,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
  },
  indicator: {
    position: "absolute",
    top: 6,
    bottom: 6,
    left: 6,
    borderRadius: 20,
    boxShadow: "0 6px 20px rgba(192,244,71,0.35)",
  },
  tab: { flex: 1, alignItems: "center", gap: 3, paddingVertical: 8 },
});
