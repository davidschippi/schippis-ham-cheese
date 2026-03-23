# Ham Pocket Pro Plus – Vite + Capacitor v11.4

Korrekturen in dieser Version:
- **Locator Datum** und **GPS-Standort Datum** sind jetzt sichtbar
- **GPS-Standort Zeit** wird nicht mehr vom Locator überschrieben
- **GPS-Standort Zeit** nutzt nur noch den separaten Buttonpfad bzw. die echte Geräte-/aktuelle Positionszeit
- **Locator Zeit** bleibt an den aktuell angezeigten Locator gebunden

## Update
```powershell
npm install
npm run build
npx cap sync android
npx cap open android
```

- oberer Safe-Area-Abstand für Statusleiste vergrößert
