# Implementation Plan - Android Bridge App (PaisaBridge PK)

Implement the native Android Bridge App in Kotlin and Jetpack Compose for PaisaBridge PK, enabling real-time bank SMS and push notification forwarding to the backend Worker API.

## User Review Required
> [!IMPORTANT]
> Please review the implementation plan below covering the Android Bridge app architecture, background services, security, and UI components.

- **NotificationListenerService & SMS Receiver**: Intercepts payment notifications from allowed banking apps (Easypaisa, JazzCash, Meezan, Bank Alfalah, etc.) and raw SMS messages.
- **Offline Reliability**: Room database buffer and WorkManager background retry queue for offline buffering when network is unavailable.
- **Pairing**: QR code scanner to securely provision device ID and device secret from the merchant panel.
- **Security**: HMAC-SHA256 request signing using device secret, timestamp, and nonce.
- **Background Operations**: Foreground service with persistent notification, battery optimization exemption, and boot auto-start receiver.

## Proposed Changes

### 1. Room Database & Offline Buffer (`/app/src/main/java/.../data/`)
- `BridgeDatabase`: Room database for storing pending and failed notification payloads when offline.
- `PendingNotificationEntity`: Entity storing id, provider, rawText, sender, timestamp, retryCount.
- `PendingNotificationDao`: CRUD operations for offline queue.

### 2. Network & Cryptography (`/app/src/main/java/.../network/`)
- `HmacInterceptor` / `HmacUtils`: Generates `X-Signature` HMAC-SHA256 over `timestamp + nonce + body` using the provisioned device secret.
- `BridgeApiService`: Retrofit API client for `/bridge/notify`, `/bridge/heartbeat`, and `/bridge/config`.

### 3. Background Services & Receivers (`/app/src/main/java/.../service/`)
- `BridgeNotificationListenerService`: Extends `NotificationListenerService`. Filters incoming notifications against allowed packages and financial keywords fetched from `/bridge/config`.
- `SmsReceiver`: BroadcastReceiver catching SMS messages as a fallback.
- `BridgeForegroundService`: Foreground service ensuring high priority execution and periodic heartbeat transmissions.
- `SyncWorker`: WorkManager worker processing the Room offline queue with exponential backoff.
- `BootReceiver`: Restarts foreground service and heartbeat on device boot.

### 4. UI & Pairing (`/app/src/main/java/.../ui/`)
- `MainActivity`: Jetpack Compose navigation host.
- `PairingScreen`: QR code scanner activity using CameraX/ZXing or barcode scanning for pairing (`Worker URL + Device ID + Secret`).
- `StatusScreen`: Main dashboard showing connection status (Online/Offline), last sync time, queue size, battery status, and a "Test Notification" button.
- `SettingsScreen`: Base URL configuration, battery optimization request dialog.

## Verification Plan
- **Automated Tests**:
  - Run `gradle :app:testDebugUnitTest` to verify Room DAO and HMAC signing logic.
- **Build Verification**:
  - Run `compile_applet` to ensure zero compilation errors across Gradle, AndroidManifest, and Kotlin sources.
