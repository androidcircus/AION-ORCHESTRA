import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aion.orchestra',
  appName: 'AION Orchestra',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  },
  // Ensure the app works with the local Nebula backend
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
