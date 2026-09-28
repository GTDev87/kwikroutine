import React from "react";
import { Linking, ScrollView, View } from "react-native";
import { C, Card, PageTitle, StepBar, T, s } from "../components/ui";
export function Privacy({ go }: { go: (route: string) => void }) {
  return (
    <View style={{ flex: 1 }}>
    <StepBar onBack={() => go("profile")} />
    <ScrollView contentContainerStyle={[s.page, { paddingTop: 8 }]}>
      <PageTitle title="Privacy & terms" subtitle="Your workouts stay on your phone. Here’s exactly what that means." />
      <Card>
        <T style={s.bold}>Fitness data stays on your phone</T>
        <T>
          Your preferences, soreness selections, equipment, feedback, and
          workout history and exercise suggestions are stored locally. Your history
          helps personalize suggestions on this phone. Kwikroutine has no login,
          advertising, or fitness analytics service. Device backups, if enabled
          by your operating system, are managed by that system.
        </T>
      </Card>
      <Card>
        <T style={s.bold}>Purchases are the online part</T>
        <T>
          When configured, RevenueCat and Apple or Google process anonymous
          billing identifiers, purchase records, and subscription status. They
          do not receive your soreness selections or workout history from this
          app. Buying, restoring, and refreshing a subscription require the
          internet.
        </T>
      </Card>
      <Card>
        <T style={s.bold}>Your free days and subscription</T>
        <T>
          Your first 14 days begin when you finish onboarding. No payment
          details are needed and nothing is charged automatically at the end. If
          you choose a paid plan, the store confirms its localized price and
          renewal terms. Subscriptions renew until you cancel through your
          store. Deleting the app does not cancel a subscription.
        </T>
      </Card>
      <Card>
        <T style={s.bold}>Move at your own pace</T>
        <T>
          Kwikroutine provides general exercise suggestions. It does not
          diagnose injuries or replace individualized professional guidance. Use
          a comfortable range, learn unfamiliar techniques, and stop a movement
          that causes pain.
        </T>
      </Card>
      <Card>
        <T style={s.bold}>Your data, your choice</T>
        <T>
          You can clear your workout history in Settings and remove saved places
          under Profile. Uninstalling removes local fitness data unless your device
          restores it from a backup. Trial and store purchase records may
          persist. There is no cloud fitness account to recover your history
          from.
        </T>
      </Card>
      <Card>
        <T style={s.bold}>Exercise pictures & credits</T>
        <T>Our library includes RepDB’s licensed illustrations and original AI-generated exercise illustrations. Pictures are visual references; equipment designs vary. Some exercises include start and finish pictures.</T>
        <T accessibilityRole="link" onPress={() => void Linking.openURL("https://repdb.co")} style={{color:C.accent}}>Exercise data by RepDB (repdb.co)</T>
        <T accessibilityRole="link" onPress={() => void Linking.openURL("https://commons.wikimedia.org/wiki/File:Exercise_Chair_Squat.png")} style={{color:C.accent}}>Chair squat illustration: BruceBlaus, CC BY-SA 4.0 (unmodified)</T>
        <T accessibilityRole="link" onPress={() => void Linking.openURL("https://creativecommons.org/licenses/by-sa/4.0/")} style={{color:C.accent}}>View Creative Commons license</T>
        <T accessibilityRole="link" onPress={() => void Linking.openURL("https://commons.wikimedia.org/wiki/File:Powerrack.jpg")} style={{color:C.accent}}>Power rack photo: Matus, CC BY 3.0 (unmodified)</T>
        <T accessibilityRole="link" onPress={() => void Linking.openURL("https://creativecommons.org/licenses/by/3.0/")} style={{color:C.accent}}>View photo license</T>
        <T style={[s.small,s.muted]}>RepDB Free Tier License v1.0. Local JPEG/PNG conversions. Original Kwikroutine exercises remain available.</T>
      </Card>
      <T style={[s.small, s.muted]}>
        Pre-release disclosure. The publisher’s contact information and
        published privacy policy must be added before store distribution.
      </T>
    </ScrollView>
    </View>
  );
}
