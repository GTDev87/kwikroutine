import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Exercise } from '../domain/types';
import { picturesFor } from '../data/picturesFor';
import { C, Chip, R } from './ui';
export { picturesFor } from '../data/picturesFor';
// Illustrations come in many aspect ratios and background colors. A blurred, dimmed copy
// fills the frame behind the uncropped picture, so every one reads as the same card.
export function ExercisePicture({ exercise, height = 200, poses = false, radius = R.card }: { exercise: Exercise; height?: number; poses?: boolean; radius?: number }) {
  const pictures = picturesFor(exercise);
  const [pose, setPose] = useState(0);
  if (!pictures.length) return null;
  const source = pictures[pose % pictures.length];
  return <View style={{ gap: 10 }}>
    <View style={{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: C.plate }}>
      <Image source={source} blurRadius={24} resizeMode="cover" style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.2 }] }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12,12,13,0.18)' }]} />
      <Image source={source} accessibilityLabel={`${exercise.name} — ${pictures.length > 1 ? (pose ? 'finish' : 'start') + ' ' : ''}illustration`} resizeMode="contain" style={{ width: '100%', height }} />
    </View>
    {poses && pictures.length > 1 && <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
      <Chip small label="Start position" selected={pose === 0} onPress={() => setPose(0)} />
      <Chip small label="Finish position" selected={pose === 1} onPress={() => setPose(1)} />
    </View>}
  </View>;
}
