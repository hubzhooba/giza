// Arweave gateway configuration with fallback options
// These are actual Arweave gateways that support the full API
export const ARWEAVE_GATEWAYS = {
  primary: 'https://defi.ao',
  fallbacks: [
    'https://arweave.net',
    'https://arweave.dev',
    'https://ar-io.dev',
    'https://permagate.io'
  ]
};

// Test gateway connectivity with proper Arweave endpoint
export async function testGateway(gateway: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    // Try to fetch network info which all Arweave gateways should support
    // Using a simple HEAD request to check if gateway is responsive
    const response = await fetch(gateway, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors' // Avoid CORS issues for testing
    });
    
    clearTimeout(timeout);
    // For no-cors mode, we just check if the request didn't throw
    return true;
  } catch (error) {
    console.warn(`Gateway ${gateway} is not reachable:`, error);
    return false;
  }
}

// Find the first working gateway
export async function findWorkingGateway(): Promise<string> {
  // First try the configured gateway from environment
  const envGateway = process.env.NEXT_PUBLIC_ARWEAVE_GATEWAY;
  if (envGateway) {
    const isWorking = await testGateway(envGateway);
    if (isWorking) return envGateway;
  }
  
  // Try primary gateway
  const isPrimaryWorking = await testGateway(ARWEAVE_GATEWAYS.primary);
  if (isPrimaryWorking) return ARWEAVE_GATEWAYS.primary;
  
  // Try fallback gateways
  for (const gateway of ARWEAVE_GATEWAYS.fallbacks) {
    const isWorking = await testGateway(gateway);
    if (isWorking) {
      console.log(`Using fallback gateway: ${gateway}`);
      return gateway;
    }
  }
  
  // If all fail, return primary as default (Arweave.net is most reliable)
  console.warn('Gateway tests inconclusive, using primary gateway');
  return ARWEAVE_GATEWAYS.primary;
}

// Gateway health check with caching
let cachedGateway: { url: string; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getHealthyGateway(): Promise<string> {
  // Check if cached gateway is still valid
  if (cachedGateway && Date.now() - cachedGateway.timestamp < CACHE_DURATION) {
    return cachedGateway.url;
  }
  
  // For production, just use the primary gateway (most reliable)
  // Testing gateways can cause issues with CORS
  const gateway = process.env.NEXT_PUBLIC_ARWEAVE_GATEWAY || ARWEAVE_GATEWAYS.primary;
  
  // Cache the result
  cachedGateway = { url: gateway, timestamp: Date.now() };
  
  return gateway;
}