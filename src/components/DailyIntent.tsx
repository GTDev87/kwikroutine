import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Chip, T, C, fonts, s } from './ui';
import { INTENTS, intentLabels, styleLabels } from '../domain/types';
import { dailyIntent, chooseStyle } from '../domain/personalization';
import { dayKey, todayCheckIn } from '../domain/today';
import { useStore } from '../state/store';

// Optional disclosure, never another setup step. The default needs no answer.
export function DailyIntent() {
  const { data, update } = useStore();
  const [expanded, setExpanded] = useState(false);
  const intent = dailyIntent(data);
  const style = chooseStyle(data, data.selectedLocationId, intent);
  return <View style={{ gap: 12 }}>
    <View style={s.between}>
      <T style={s.sectionTitle}>How should it feel?</T>
      <Pressable accessibilityRole="button" accessibilityLabel="Change today's intent" accessibilityState={{ expanded }} hitSlop={10} onPress={() => setExpanded(!expanded)}>
        <T style={{ color: C.accent, fontSize: 14, fontFamily: fonts.semibold }}>{expanded ? 'Done' : 'Change'}</T>
      </Pressable>
    </View>
    {!expanded && <T style={[s.small, s.muted]}>
      <T style={[s.small, { fontFamily: fonts.semibold }]}>{intentLabels[intent]}</T>
      {` · ${styleLabels[style]}`}
    </T>}
    {expanded && <View style={s.wrap}>{INTENTS.map(value => <Chip key={value} label={intentLabels[value]} selected={intent === value} onPress={() => {
      update(d => ({ ...d, checkIn: { ...todayCheckIn(d), day: dayKey(), intent: value } }));
      setExpanded(false);
    }} />)}</View>}
  </View>;
}
