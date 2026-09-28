import React, { useEffect } from "react";
import {
  ActivityIndicator,
  AppState,
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
          <View style={{ flex: 1 }}>
            <Slot />
          </View>
          {isTab && (
            <View style={styles.tabs} accessibilityRole="tablist">
              {tabs.map((tab) => (
                <Pressable
                  key={tab.id}
                  accessibilityRole="tab"
                  accessibilityLabel={tab.title}
                  accessibilityState={{ selected: tab.id === route }}
                  onPress={() => setRoute(tab.id)}
                  style={styles.tab}
                >
                  <TabIcon id={tab.id} on={route === tab.id} />
                  <T
                    style={{
                      fontSize: 12,
                      lineHeight: 15,
                      fontFamily: fonts.semibold,
                      color: route === tab.id ? C.ink : C.muted,
                    }}
                  >
                    {tab.title}
                  </T>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </>
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
  tabs: {
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.bar,
  },
  tab: { flex: 1, alignItems: "center", gap: 5 },
});
