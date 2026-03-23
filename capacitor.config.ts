import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.davidx.schippis_ham_cheese',
  appName: "Schippi's Ham&Cheese",
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
