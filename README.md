# Schippi's Ham&Cheese

Ein mobiles Amateurfunk-Toolkit mit Fokus auf Praxisbetrieb (Portable / Field).
A mobile Amateur Radio Toolkit with focus on Portable / Field

---

## 🚀 Features

🌙 General
🌌 Modern dark-themed user interface
🌓 Theme switching
🌍 DE/EN language switching
📂 Dropdown navigation for all main sections
👤 Header Section
🪪 Display of operator name
📡 Display of callsign
🌓 Theme toggle button
🌐 DE/EN language button
🧭 Quick section switching via dropdown menu
📍 My Location
📡 Fetch GPS position
🟡🟢 GPS status directly via button state
🔄 Reset location data
📋 Copy full information block
📤 Share location data
🧩 Copy locator
🏠 Enter address manually
🗺️ Convert address to locator
🏳️ Display country
🏙️ Display city
🛣️ Display street
📍 Display locator
🕒 Time and Date
🕓 GPS local time
📅 GPS local date
🌐 UTC time
🗓️ UTC date
📡 Locator local time
📆 Locator local date
📐 Coordinate Formats
📌 Google coordinates
🧭 Degrees / Minutes / Seconds
📏 Decimal minutes
📡 Counterstation / Code / Country Prefix / Locator
⌨️ Input for callsign
🔤 Input for Q-code
🌍 Input for country prefix
📍 Input for locator
🧮 Coordinate field input
🏛️ Open BNetzA
🗺️ Open map
📋 Result Fields
🌍 Country / meaning
🏙️ City
🛣️ Street
📡 CQ / ITU / locator
💡 Note / hint
📏 Distance
🧭 Direction / azimuth
📶 Band / frequency recommendation
🕒 Locator time
🗺️ Map info
📶 Band Recommendation
📍 Location-based band recommendation
🕒 Recommendation based on time of day
🍂 Recommendation based on season
☀️ Recommendation based on propagation conditions
🌦️ Recommendation based on weather
📊 Displays
📍 Current reference location
🍁 Current season
🌗 Current time phase
☀️🌦️ Combined propagation / weather summary
📻 Recommendation Areas
✅ Best bands now
⏳ Interesting later
❓ Why right now
🇩🇪 German License Classes
📘 Compact overview of German amateur radio license classes
🟢 Class N
🔵 Class E
🔴 Class A
🧾 Per Class
📡 Typical bands / ranges
⚡ Power limits
🧭 Typical use cases
ℹ️ Note about the 6 m rule change
☀️ Propagation
🌞 Solar and propagation data
📈 SFI
🧲 A-index
🌍 K-index
☀️ Sunspots
⚡ X-ray data
🌫️ Noise / geomagnetic info
📻 Conditions
📡 HF conditions
📶 VHF conditions
🕓 Status Info
🕒 Last update timestamp
🔗 Source display
🌦️ Weather
📍 Weather data for the selected location
🌡️ Temperature
💨 Wind
☁️ Cloud cover
🌧️ Precipitation
🌅 Sunrise
🌇 Sunset
🏕️ Short practical note for radio and portable operation
🛠️ Usability and UI Improvements
💾 Inputs and GPS data stay available when switching tabs
🧱 Cleaner field grouping and layout
📐 Time/date fields arranged in a clean 2×3 grid
🎯 Centered labels, fields and values across the interface
✨ Cleaner and more compact visual design
🗑️ Removed unused French interface
🔧 Improved Android build stability
📲 Better handling of mobile layout and button states

---

## 🛠️ Setup

```bash
npm install
npm run build
npx cap sync android
npx cap open android


# 📜 Changelog

## v1.4.0
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
