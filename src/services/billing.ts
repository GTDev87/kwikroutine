import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import { Billing } from "../domain/types";

const key =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
let configured = false;
export const billingAvailable = Platform.OS !== "web" && !!key;
export function configureBilling() {
  if (!billingAvailable || configured) return;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: key! }); // No user account: RevenueCat's anonymous identity.
  configured = true;
}
export function toBilling(info: CustomerInfo): Billing {
  const entitlement = info.entitlements.active["kwikroutine_pro"];
  return {
    active: !!entitlement,
    expiresAt: entitlement?.expirationDate
      ? Date.parse(entitlement.expirationDate)
      : null,
    verifiedAt: Date.parse(info.requestDate),
    managementURL: info.managementURL,
  };
}
export async function refreshBilling() {
  configureBilling();
  return configured ? toBilling(await Purchases.getCustomerInfo()) : null;
}
export async function offerings(): Promise<PurchasesPackage[]> {
  configureBilling();
  return configured
    ? ((await Purchases.getOfferings()).current?.availablePackages ?? [])
    : [];
}
export async function purchase(pkg: PurchasesPackage) {
  return toBilling((await Purchases.purchasePackage(pkg)).customerInfo);
}
export async function restore() {
  configureBilling();
  if (!configured)
    throw new Error("Purchases are not available in this build yet.");
  return toBilling(await Purchases.restorePurchases());
}
export function listenBilling(fn: (billing: Billing) => void) {
  configureBilling();
  if (!configured) return () => {};
  const listener = (info: CustomerInfo) => fn(toBilling(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
