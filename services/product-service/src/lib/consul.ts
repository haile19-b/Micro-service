import dotenv from "dotenv";
dotenv.config();

const CONSUL_URL = process.env.CONSUL_URL || "http://localhost:8500";

export class ConsulRegistry {
  private static serviceId: string;
  private static serviceName: string;

  static async register(name: string, port: number) {
    this.serviceName = name;
    // Unique ID prevents multiple instances on different ports from overwriting each other
    this.serviceId = `${name}-${port}`;

    const registrationBody = {
      ID: this.serviceId,
      Name: this.serviceName,
      Address: "127.0.0.1",
      Port: port,
      Check: {
        // Consul will ping this endpoint to verify health status
        HTTP: `http://host.docker.internal:${port}/health`,
        Interval: "10s",
        Timeout: "5s",
        // Automatically remove the service instance if it remains dead for over 1 minute
        DeregisterCriticalServiceAfter: "1m"
      }
    };

    try {
      console.log(`📡 Registering ${this.serviceId} with Consul...`);
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