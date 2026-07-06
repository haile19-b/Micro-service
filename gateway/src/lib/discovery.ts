import dotenv from "dotenv";
dotenv.config();

const CONSUL_URL = process.env.CONSUL_URL || "http://localhost:8500";

interface ConsulServiceResponse {
  Service: {
    Address: string;
    Port: number;
  };
}

// In-memory cache of service instances: serviceName -> { urls, lastFetched }
const serviceCache: Record<string, { urls: string[]; lastFetched: number }> = {};
const CACHE_TTL = 10000; // 10 seconds cache TTL

// Keeps track of the current round-robin index for each service
const loadBalancerIndexes: Record<string, number> = {};

/**
 * Queries Consul for healthy instances of a service and caches the results
 */
export async function getServiceInstances(serviceName: string): Promise<string[]> {
  const now = Date.now();
  const cached = serviceCache[serviceName];

  // If cache is fresh, return it immediately
  if (cached && now - cached.lastFetched < CACHE_TTL) {
    return cached.urls;
  }

  try {
    console.log(`🔍 Querying Consul for healthy instances of: ${serviceName}...`);
    const response = await fetch(`${CONSUL_URL}/v1/health/service/${serviceName}?passing=true`);
    if (!response.ok) {
      throw new Error(`Consul query failed with status ${response.status}`);
    }

    const data = (await response.json()) as ConsulServiceResponse[];
    const urls = data.map((item) => `http://${item.Service.Address}:${item.Service.Port}`);

    console.log(`✅ Discovered healthy instances for ${serviceName}:`, urls);
    serviceCache[serviceName] = { urls, lastFetched: now };
    return urls;
  } catch (error) {
    console.error(`❌ Failed to discover service ${serviceName}:`, error);
    // If Consul is down but we have cached urls (even if stale), fallback to them
    return cached ? cached.urls : [];
  }
}

/**
 * Selects a healthy service URL using a Round Robin algorithm
 */
export async function resolveServiceUrl(serviceName: string): Promise<string> {
  const instances = await getServiceInstances(serviceName);
  
  if (instances.length === 0) {
    throw new Error(`503: Service ${serviceName} has no healthy instances available`);
  }

  if (loadBalancerIndexes[serviceName] === undefined) {
    loadBalancerIndexes[serviceName] = 0;
  }

  const index = loadBalancerIndexes[serviceName];
  const targetUrl = instances[index % instances.length];

  // Move index to the next instance
  loadBalancerIndexes[serviceName] = (index + 1) % instances.length;

  console.log(`⚖️ Load Balancer [${serviceName}] -> Routing to: ${targetUrl}`);
  return targetUrl;
}
