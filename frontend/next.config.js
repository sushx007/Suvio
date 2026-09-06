const path = require('path');

const nextConfig = {
  output: 'standalone',
  // Silences the "Next.js inferred your workspace root" warning caused by
  // the stub /app/yarn.lock lingering above the real /app/frontend project.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
    ],
  },
  serverExternalPackages: ['mongodb'],
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
  async headers() {
    // CORS + framing headers. If CORS_ORIGINS is not set, no ACAO header is
    // emitted (Next.js drops entries with empty values), which is the safer
    // default than `*` for a production/auth-bearing app.
    const cors = process.env.CORS_ORIGINS;
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors *;' },
          ...(cors
            ? [
                { key: 'Access-Control-Allow-Origin', value: cors },
                { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
                { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
                { key: 'Access-Control-Allow-Credentials', value: 'true' },
              ]
            : []),
        ],
      },
    ];
  },
};

module.exports = nextConfig;
