import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.advrix.crm",
  appName: "Advrix CRM",
  webDir: "www",
  server: {
    url: "https://advrix-crm-2-0-tdd7-alpha.vercel.app",
    cleartext: false,
  },
  android: {
    backgroundColor: "#1D2A32",
    allowMixedContent: false,
  },
};

export default config;