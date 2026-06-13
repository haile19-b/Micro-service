import amqp from "amqplib";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
class RabbitMQ {
    static connection = null;
    static channel = null;
    static reconnectTimer = null;
    static isReconnecting = false;
    /**
     * Establishes a TCP connection and a channel to RabbitMQ.
     * If a connection is already open, it returns it.
     */
    static async connect() {
        // 1. If connection and channel already exist and we aren't reconnecting, reuse them
        if (this.connection && this.channel && !this.isReconnecting) {
            return { connection: this.connection, channel: this.channel };
        }
        try {
            console.log(`🔌 Connecting to RabbitMQ at ${RABBITMQ_URL}...`);
            // 2. Establish connection to the broker
            const conn = await amqp.connect(RABBITMQ_URL);
            // 3. Setup event listeners for connection issues
            conn.on("error", (err) => {
                console.error("❌ RabbitMQ connection error:", err);
            });
            conn.on("close", () => {
                console.warn("⚠️ RabbitMQ connection closed. Attempting reconnect...");
                this.handleDisconnect();
            });
            // 4. Create the channel for operations
            const chan = await conn.createChannel();
            chan.on("error", (err) => {
                console.error("❌ RabbitMQ channel error:", err);
            });
            this.connection = conn;
            this.channel = chan;
            this.isReconnecting = false;
            // 5. Clear reconnection timer on successful connection
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            console.log("✅ Connected to RabbitMQ successfully");
            return { connection: conn, channel: chan };
        }
        catch (error) {
            console.error("❌ Failed to connect to RabbitMQ:", error);
            this.handleDisconnect();
            throw error;
        }
    }
    /**
     * Handles disconnections and triggers the reconnect process.
     */
    static handleDisconnect() {
        if (this.isReconnecting)
            return;
        this.isReconnecting = true;
        this.connection = null;
        this.channel = null;
        // Clear any existing timer and schedule a reconnect in 5 seconds
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.reconnect(), 5000);
    }
    /**
     * Re-establishes a connection with RabbitMQ.
     */
    static async reconnect() {
        try {
            console.log("🔄 Attempting to reconnect to RabbitMQ...");
            await this.connect();
        }
        catch (error) {
            console.error("❌ Reconnection failed:", error);
            this.isReconnecting = false;
            this.handleDisconnect(); // Re-schedule reconnection retry
        }
    }
    /**
     * Assures a queue exists and publishes a JSON message.
     */
    static async publishMessage(queue, message) {
        const { channel } = await this.connect();
        // Durable = true means the queue survives broker restarts
        await channel.assertQueue(queue, { durable: true });
        // Serialize message payload to a Buffer and set persistent: true
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
            persistent: true,
        });
        console.log(`📤 Message sent to queue [${queue}]`);
    }
    /**
     * Listens to a queue and executes a callback upon receiving a message.
     */
    static async consumeMessage(queue, callback) {
        const { channel } = await this.connect();
        await channel.assertQueue(queue, { durable: true });
        // Set prefetch to 1 so the consumer is not overloaded with too many messages at once
        await channel.prefetch(1);
        await channel.consume(queue, async (msg) => {
            if (msg !== null) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    console.log(`📥 Received message from queue [${queue}]`);
                    // Execute consumer logic
                    await callback(content);
                    // Acknowledge receipt to delete message from queue
                    channel.ack(msg);
                }
                catch (error) {
                    console.error(`❌ Error processing message from queue [${queue}]:`, error);
                    // nack parameters: msg, allUpTo (false), requeue (false)
                    // Requeue = false drops it or routes to DLQ to avoid infinite poison pill processing
                    channel.nack(msg, false, false);
                }
            }
        });
        console.log(`🎧 Started consuming from queue [${queue}]`);
    }
    /**
     * Cleanly closes open channels and connections.
     */
    static async close() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.channel) {
            try {
                await this.channel.close();
            }
            catch (err) {
                console.error("Error closing channel:", err);
            }
            this.channel = null;
        }
        if (this.connection) {
            try {
                await this.connection.close();
            }
            catch (err) {
                console.error("Error closing connection:", err);
            }
            this.connection = null;
        }
        this.isReconnecting = false;
        console.log("🔌 RabbitMQ connections closed");
    }
}
export default RabbitMQ;
