/**
 * Version Information
 * Centralized version and build information
 */

export const VERSION_INFO = {
  version: '0.2.0',
  buildDate: '2025-01-27',
  buildNumber: '001',
  environment: import.meta.env.MODE || 'production',
  
  // Feature flags
  features: {
    authentication: true,
    realtime: true,
    alarms: true,
    history: true,
    boards: true,
    inventory: true,
    settings: true,
  },

  // API versions
  api: {
    version: 'v1',
    baseUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
  },

  // App metadata
  app: {
    name: 'SCADA Pro',
    title: 'Industrial IoT Monitoring Dashboard',
    description: 'Real-time sensor monitoring and alarm management system',
    author: 'SCADA Pro Team',
    license: 'Proprietary',
  },

  // Build information
  build: {
    timestamp: new Date('2025-01-27').getTime(),
    revision: 'v0.1.0-001',
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
  },
};

/**
 * Get full version string
 */
export const getVersionString = (): string => {
  return `${VERSION_INFO.version} (${VERSION_INFO.buildDate})`;
};

/**
 * Get version with environment
 */
export const getFullVersion = (): string => {
  return `${VERSION_INFO.version}-${VERSION_INFO.environment}`;
};

/**
 * Check if feature is enabled
 */
export const isFeatureEnabled = (feature: keyof typeof VERSION_INFO.features): boolean => {
  return VERSION_INFO.features[feature];
};

/**
 * Get build info string
 */
export const getBuildInfo = (): string => {
  return `Build #${VERSION_INFO.buildNumber} - ${new Date(VERSION_INFO.build.timestamp).toLocaleString()}`;
};

// Export for debugging
if (import.meta.env.DEV) {
  console.log('SCADA Pro Version:', getVersionString());
  console.log('Build Info:', getBuildInfo());
  console.log('API URL:', VERSION_INFO.api.baseUrl);
}
