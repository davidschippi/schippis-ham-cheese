# Schippi's Ham&Cheese

Ein mobiles Amateurfunk-Toolkit mit Fokus auf Praxisbetrieb (Portable / Field).

---

## 🚀 Features

- 📡 Rufzeichen-Erkennung
- 🌍 Locator (Maidenhead) Unterstützung
- 📍 GPS Standort + Zeit + Datum
- 🧭 Entfernung & Richtung zur Gegenstation
- 🗺️ Google Maps Integration
- 📶 Band-/Frequenz-Empfehlung
- 🔤 Q-Code Erkennung (umfangreiche Liste)
- 📋 Copy & Share Funktion (WhatsApp etc.)
- 💾 Speicherung von Name & Rufzeichen
- 🌙 Dark / Light Mode
- 📍 Adresse → Locator Umrechnung

---

## 🛠️ Setup

```bash
npm install
npm run build
npx cap sync android
npx cap open android


# 📜 Changelog

## v1.6.0
- Complete overhaul of Q-code system
- Fixed Android build issues (resource / app_name errors)
- Reworked app icon system
- Parser stability improvements
- Improved input recognition logic

---

## v1.5.0
- Added sharing functionality (WhatsApp, etc.)
- Copy button for data block
- Persistent storage for name and callsign
- UI improvements

---

## v1.4.0
- Integrated Google Maps link
- Improved map functionality
- Enhanced coordinate display

---

## v1.3.0
- Distance calculation to remote station
- Bearing (direction) display
- Band / frequency recommendation

---

## v1.2.0
- Added Q-code support
- Improved input parsing system
- Automatic uppercase conversion

---

## v1.1.0
- GPS location integration
- Maidenhead locator calculation
- Local time and UTC display

---

## v1.0.0
- Initial release
- Basic functionality (locator, basic display)

📱 planned upcoming features
BNetzA Callsign lookup (without backend)
Offline-Mode
Export (ADIF / CSV)
