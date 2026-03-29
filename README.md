# Schippi's Ham&Cheese

A compact amateur radio helper app focused on location tools, locator handling, propagation, weather, band recommendations, and practical station utilities.

## ✨ Features

- 📍 GPS and address-based location tools
- 🧭 Locator conversion and coordinate formats
- 📡 Counterstation, callsign, Q-code and prefix helpers
- 📏 Distance and azimuth calculation
- 🌍 German and English interface
- 🌓 Lightweight theme toggle
- 📂 Dropdown-based tab navigation
- 📶 Smart band recommendations
- 🇩🇪 German amateur radio class overview (N / E / A)
- ☀️ HF and VHF propagation display
- 🌦️ Weather data for the selected location
- 🕒 GPS, UTC and locator-based time/date display
- 📋 Copy, share and quick-access tools
- 📱 Compact mobile-friendly UI

## 🧩 Main Sections

### My Location
Get your current GPS position, convert addresses into locators, view multiple coordinate formats, and check local, UTC, and locator-based time/date information.

### Counterstation / Code / Prefix / Locator
Look up callsigns, prefixes, Q-codes, locators, distance, azimuth, and map-related information for the other station.

### Band Recommendation
Receive practical band suggestions based on location, time of day, season, weather, and propagation conditions.

### German License Classes
Quick overview of German amateur radio license classes N, E, and A, including typical band access and basic operating limits.

### Propagation
View key HF and VHF propagation data such as SFI, A-index, K-index, sunspots, and general band conditions.

### Weather
Check weather conditions for the selected location, including temperature, wind, cloud cover, precipitation, sunrise, and sunset.

## 🛠 Tech Stack

- HTML / CSS / JavaScript
- Capacitor
- Android Studio / Gradle

## 🛠️ Setup

```bash
npm install
npm run build
npx cap sync android
npx cap open android


# 📜 Changelog

## v1.7.2
- Added more tolerant address search
- Added multiple address suggestions
- Added live address suggestions while typing
- Added improved DE Classes overview with included frequency ranges

🛠 Improved
- Refined alignment and centering across several sections
- Improved readability and structure of the DE Classes tab
- Improved formatting of long texts and frequency information
- Further polished overall mobile layout and visual consistency

✅ Fixed
- Fixed remaining layout and centering issues
- Fixed formatting problems in the DE Classes section
- Improved address search behavior and result selection


## v1.7.0
- new tab navigation via dropdown menu
- new Band Recommendation section
- new German License Classes section
- new Propagation section
- new Weather section
- band recommendations now based on:
- location
- time of day
- season
- weather
- radio propagation conditions
- overview of German amateur radio license classes N, E and A
- display of HF and VHF propagation data
- weather data for the currently set location
- UTC date added alongside UTC time
- GPS button with dynamic states:
- Get GPS
- GPS is being fetched
- GPS fix
- DE/EN language switch reintroduced in the header
- Improved
- all existing core tools remain available:
- distance calculation
- heading / azimuth display
- Q-code / country prefix / locator analysis
- map links
- sharing
- copy locator
- copy full block
- input values and GPS data are preserved when switching tabs
- improved field arrangement on the main page
- time and date fields reorganized into a clean 2x3 layout
- coordinate fields visually refined
- centered alignment for text and values across many cards and fields
- more compact and cleaner UI
- DE/EN language handling cleaned up
- theme button simplified

Fixed:
- Android resource build errors
- missing string resource issues
- data loss when switching tabs
- band recommendation missing reference location
- propagation now loads more reliably
- Weather and Band Recommendation tabs loading correctly again
- multiple layout and centering issues
- CSS/UI centering rules that were previously not applied correctly

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
