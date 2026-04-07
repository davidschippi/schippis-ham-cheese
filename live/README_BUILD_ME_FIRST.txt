Schippi's Ham&Cheese – fertiges Paket

In diesem Paket ist bereits vorbereitet:
- App-Name: Schippi's Ham&Cheese
- Capacitor-Konfiguration bereinigt
- Syntaxfehler in src/main.js behoben
- Android-App-Name in strings.xml gesetzt
- Icon-Dateien im Paket enthalten

Danach bitte:
1. ZIP entpacken
2. im Projektordner ausführen:

npm install
npm run build
npx cap sync android
npx cap open android

Dann in Android Studio:
- Build > Generate Signed App Bundle / APK
- oder Build > Build APK(s)

Falls das Icon nicht sofort sichtbar ist:
- Build > Clean Project
- Build > Rebuild Project
