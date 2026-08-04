import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // Dev mode ma PWA disable rakhshe jethi reload fast thay
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Any existing config options
  // Provide an explicit (possibly empty) turbopack config to avoid
  // the Turbopack vs webpack config detection error during build.
  turbopack: {},
};

export default withPWA(nextConfig);