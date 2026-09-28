import { Profile } from './types';
export type WeightUnit = 'lb' | 'kg';
const KG_PER_LB = 0.45359237;
export const weightUnit = (profile: Profile | null): WeightUnit => profile?.weightUnit ?? 'lb';
// Keep all stored measurements in kg, including logs created before units existed.
export const toKg = (value: number, unit: WeightUnit) => Math.round(value * (unit === 'lb' ? KG_PER_LB : 1) * 1e6) / 1e6;
export const fromKg = (value: number, unit: WeightUnit) => value / (unit === 'lb' ? KG_PER_LB : 1);
export const displayWeight = (kg: number, unit: WeightUnit) => String(Math.round(fromKg(kg, unit) * 100) / 100);
