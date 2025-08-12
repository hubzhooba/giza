// Arweave gateway configuration with fallback options
export const ARWEAVE_GATEWAYS = {
  primary: 'https://g8way.io',
  fallbacks: [
    'https://ar.io',
    'https://arweave.dev',
    'https://arweave-search.goldsky.com',
  ]
};

// Test gateway connectivity
export async function testGateway(gateway: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${gateway}/info`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    return response.ok;
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
  
  // If all fail, return primary as default
  console.warn('All gateways failed, using primary as fallback');
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
  
  // Find a working gateway
  const gateway = await findWorkingGateway();
  
  // Cache the result
  cachedGateway = { url: gateway, timestamp: Date.now() };
  
  return gateway;
}