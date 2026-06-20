import dotenv from "dotenv";
dotenv.config();

const CONSUL_URL = process.env.CONSUL_URL || "http://localhost:8500";

export class ConsulRegistry {
  private static serviceId: string;
  private static serviceName: string;

   static async register(name: string, port: number) {
    this.serviceName = name;
    this.serviceId = `${name}-${port}`;

    // 1. Detect if running inside Docker Compose
    const isDocker = process.env.RUNNING_IN_DOCKER === "true";
    
    // Inside Docker, the container's hostname is its container ID (stored in process.env.HOSTNAME)
    // Outside Docker, we use 127.0.0.1
    const serviceAddress = isDocker ? (process.env.HOSTNAME || "127.0.0.1") : "127.0.0.1";
    
    // Consul health checker host:
    // Inside Docker, Consul pings the container hostname directly
    // Outside Docker, Consul pings host.docker.internal
    const checkHost = isDocker ? (process.env.HOSTNAME || "127.0.0.1") : "host.docker.internal";

    const registrationBody = {
      ID: this.serviceId,
      Name: this.serviceName,
      Address: serviceAddress,
      Port: port,
      Check: {
        HTTP: `http://${checkHost}:${port}/health`,
        Interval: "10s",
        Timeout: "5s",
        DeregisterCriticalServiceAfter: "1m"
      }
    };

    try {
      console.log(`📡 Registering ${this.serviceId} with Consul (isDocker: ${isDocker})...`);
      const response = await fetch(`${CONSUL_URL}/v1/agent/service/register`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationBody),
      });

      if (!response.ok) {
        throw new Error(`Consul registration failed with status ${response.status}`);
      }

      console.log(`✅ Successfully registered ${this.serviceId} with Consul`);
    } catch (error) {
      console.error(`❌ Consul registration failed:`, error);
    }
  }

  static async deregister() {
    if (!this.serviceId) return;

    try {
      console.log(`📡 Deregistering ${this.serviceId} from Consul...`);
      const response = await fetch(`${CONSUL_URL}/v1/agent/service/deregister/${this.serviceId}`, {
        method: "PUT",
      });

      if (!response.ok) {
        throw new Error(`Consul deregistration failed with status ${response.status}`);
      }

      console.log(`✅ Successfully deregistered ${this.serviceId} from Consul`);
    } catch (error) {
      console.error(`❌ Consul deregistration failed:`, error);
    }
  }
}