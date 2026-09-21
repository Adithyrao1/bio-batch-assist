import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dcm.labnest',
  appName: 'LabNest',
  webDir: 'dist',
  server: {
    // Points the app's WebView at the live dev tunnel instead of bundled files.
    // Update this whenever the tunnel URL changes, then run `npx cap sync android`.
    url: 'https://g914wt0b-8080.inc1.devtunnels.ms',
    allowNavigation: [
      'login.microsoftonline.com',
      'login.live.com',
      '*.devtunnels.ms',
    ],
  },
};

export default config;
