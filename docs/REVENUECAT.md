# RevenueCat and store configuration

## Products

Create one subscription group on Apple and corresponding subscriptions/base plans on Google Play:

| Offering package | Suggested product ID | US base price | Duration |
| --- | --- | --- | --- |
| `$rc_monthly` | `kwikroutine_monthly` | $2.99 | 1 month |
| `$rc_annual` | `kwikroutine_annual` | $19.99 | 1 year |

Attach both products to entitlement **`kwikroutine_pro`**, then place monthly and annual packages in the current/default RevenueCat offering. The app resolves packages by `packageType`, displays the store’s `priceString`, and purchases the actual package object.

Do not attach another 14-day introductory trial to these products unless intentionally changing the product policy. The first 14 days are granted locally by the app without any purchase commitment. Payment starts when the user explicitly subscribes. Configure localized prices in the stores; base prices in the project describe the requested US offer.

Set:

```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
```

These are public SDK keys, not secret REST API keys. Add the corresponding variables in EAS environments for remote builds. Production EAS builds reject missing/test SDK keys and missing/altered Laya assets.

## Identity and data

`Purchases.configure` omits an App User ID so RevenueCat assigns an anonymous identity. No app login is required. Restore uses the current platform’s store account. Automatic iOS-to-Android entitlement sharing is not provided without a shared identity. Local workout history is not transferred by Restore Purchases.

No exercise data is sent to RevenueCat: only the SDK’s billing data and anonymous identifiers. Select and test the appropriate RevenueCat restore/transfer policy before launch.

## Offline access policy

- The app trial starts once, after onboarding, and uses a SecureStore timestamp on native.
- Last-seen time is monotonic to resist simple backwards clock changes.
- A paid entitlement is locally usable until its last confirmed expiration. The app refreshes on launch and foreground when possible.
- Expiration with no network asks for reconnection/purchase; there is no indefinite paid-access promise.
- A status with no known expiration is bounded to three days since its request date.
- A fully local, accountless trial cannot be made immune to device reset/reinstall/clock manipulation, especially on Android. The app does not pretend otherwise.
- History and the exercise library remain accessible after expiry; an already-started workout can be completed and saved.

## Required sandbox checks

Run on both platforms: buy each plan, cancel the purchase sheet, pending payment, renew, expire, billing failure, refund/revoke, restore after reinstall, restore on another device in the same ecosystem, network loss mid-purchase, and long offline periods spanning expiration. Use sandbox/Test Store keys only in nonproduction builds. No live transaction has been attempted in this workspace.

References: https://www.revenuecat.com/docs/getting-started/installation/reactnative
https://www.revenuecat.com/docs/customers/identifying-customers
https://www.revenuecat.com/docs/test-and-launch/debugging/caching
