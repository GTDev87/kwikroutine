import React, { useEffect, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { PurchasesPackage } from "react-native-purchases";
import { Button, C, Card, Icon, OptionCard, PageTitle, StepBar, T, TextLink, fonts, s } from "../components/ui";
import { useStore } from "../state/store";
import { access, mergeBilling } from "../domain/engine";
import * as billing from "../services/billing";
export function Paywall({ go }: { go: (route: string) => void }) {
  const { data, update } = useStore(),
    membership = access(data);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]),
    [plan, setPlan] = useState("ANNUAL"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const found = await billing.offerings();
      setPackages(found);
      setMessage(
        !found.length
          ? billing.billingAvailable
            ? "Plans could not be loaded. Connect to the internet and try again."
            : "Subscriptions are not available in this build yet. Your free trial and workout history are still available."
          : "",
      );
    } catch {
      setMessage(
        "We couldn’t reach the store. Connect to the internet and try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const selected = packages.find((p) => p.packageType === plan);
  const buy = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const info = await billing.purchase(selected);
      update((d) => mergeBilling(d, info));
      if (info.active) {
        go("today");
      } else
        setMessage(
          "The store is still processing your purchase. Restore purchases after approval.",
        );
    } catch (error: any) {
      if (!error.userCancelled)
        setMessage(
          "Your purchase could not be completed. Please try again or restore an existing purchase.",
        );
    } finally {
      setBusy(false);
    }
  };
  const restore = async () => {
    setBusy(true);
    try {
      const info = await billing.restore();
      update((d) => mergeBilling(d, info));
      setMessage(
        info.active
          ? "Your subscription has been restored."
          : "No active subscription was found for this store account.",
      );
    } catch {
      setMessage(
        billing.billingAvailable
          ? "Restore needs an internet connection and the store account used to subscribe."
          : "Restore purchases will be available when this build is connected to the store.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1 }}>
    <StepBar onBack={() => go("today")} backLabel="Back to today" />
    <ScrollView contentContainerStyle={[s.page, { paddingTop: 8 }]}>
      <PageTitle
        title="Membership"
        subtitle={
          membership.paid
            ? "You’re subscribed. Thanks for training with us."
            : membership.trialLeft
              ? `You have ${membership.trialLeft} free ${membership.trialLeft === 1 ? "day" : "days"} left. No need to subscribe until you’re ready.`
              : "Your free days have finished. Choose a plan to keep getting fresh workouts."
        }
      />
      <Card>
        {[
          "Fresh workouts that adapt to your day",
          "Every exercise, every saved place",
          "Offline workouts. No accounts. No ads.",
        ].map((text) => (
          <View key={text} style={s.row}>
            <Icon name="check" color={C.accent} />
            <T style={{ flex: 1 }}>{text}</T>
          </View>
        ))}
      </Card>
      {!membership.paid && (
        <>
          {[
            ["ANNUAL", "Yearly", "$19.99", "/ year"],
            ["MONTHLY", "Monthly", "$2.99", "/ month"],
          ].map(([type, title, price, period]) => {
            const pkg = packages.find((p) => p.packageType === type);
            return (
              <OptionCard
                key={type}
                title={title}
                subtitle={type === "ANNUAL" ? "Billed once a year" : "Billed every month"}
                selected={plan === type}
                onPress={() => setPlan(type)}
                trailing={
                  <View style={{ alignItems: "flex-end" }}>
                    <T style={{ fontSize: 22, lineHeight: 26, fontFamily: fonts.bold }}>
                      {pkg?.product.priceString ?? price}
                    </T>
                    <T style={[s.small, s.muted]}>{period}</T>
                  </View>
                }
              />
            );
          })}
          <T style={[s.small, s.muted]}>
            Billed {plan === "ANNUAL" ? "yearly" : "monthly"}. Payment starts
            when you subscribe. Renews automatically unless canceled through
            your store settings. The free access period itself never charges
            you.
          </T>
          {!!message && (
            <View style={s.notice}>
              <T accessibilityRole="alert" style={s.small}>
                {message}
              </T>
            </View>
          )}
          <Button
            title={`Subscribe ${plan === "ANNUAL" ? "yearly" : "monthly"}${selected ? ` · ${selected.product.priceString}` : ""}`}
            busy={busy || loading}
            disabled={!selected}
            onPress={() => void buy()}
          />
          {!selected && billing.billingAvailable && (
            <Button
              title="Reload plans"
              secondary
              onPress={() => void load()}
            />
          )}
        </>
      )}
      {membership.paid && data.billing?.managementURL && (
        <Button
          title="Manage subscription"
          onPress={() =>
            void Linking.openURL(data.billing!.managementURL!).catch(() =>
              setMessage(
                "Could not open the store. Manage your subscription in your device’s store settings.",
              ),
            )
          }
        />
      )}
      <Button
        title="Restore purchases"
        secondary
        busy={busy}
        onPress={() => void restore()}
      />
      {membership.paid && !!message && (
        <T accessibilityRole="alert">{message}</T>
      )}
      <TextLink title="Privacy & terms" onPress={() => go("privacy")} style={{ alignSelf: "center" }} />
    </ScrollView>
    </View>
  );
}
