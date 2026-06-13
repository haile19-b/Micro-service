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
        if (this.connection && this.channel && !this.isReconnecting) {
            return { connection: this.connection, channel: this.channel };
        }
        try {
            console.log(`🔌 Connecting to RabbitMQ at ${RABBITMQ_URL}...`);
            const conn = await amqp.connect(RABBITMQ_URL);
            conn.on("error", (err) => {
                console.error("❌ RabbitMQ connection error:", err);
            });
            conn.on("close", () => {
                console.warn("⚠️ RabbitMQ connection closed. Attempting reconnect...");
                this.handleDisconnect();
            });
            const chan = await conn.createChannel();
            chan.on("error", (err) => {
                console.error("❌ RabbitMQ channel error:", err);
            });
            this.connection = conn;
            this.channel = chan;
            this.isReconnecting = false;
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
    static handleDisconnect() {
        if (this.isReconnecting)
            return;
        this.isReconnecting = true;
        this.connection = null;
        this.channel = null;
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.reconnect(), 5000);
    }
    static async reconnect() {
        try {
            console.log("🔄 Attempting to reconnect to RabbitMQ...");
            await this.connect();
        }
        catch (error) {
            console.error("❌ Reconnection failed:", error);
            this.isReconnecting = false;
            this.handleDisconnect();
        }
    }
    static async publishMessage(queue, message) {
        const { channel } = await this.connect();
        await channel.assertQueue(queue, { durable: true });
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
            persistent: true,
        });
        console.log(`📤 Message sent to queue [${queue}]`);
    }
    static async consumeMessage(queue, callback) {
        const { channel } = await this.connect();
        await channel.assertQueue(queue, { durable: true });
        await channel.prefetch(1);
        await channel.consume(queue, async (msg) => {
            if (msg !== null) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    console.log(`📥 Received message from queue [${queue}]`);
                    await callback(content);
                    channel.ack(msg);
                }
                catch (error) {
                    console.error(`❌ Error processing message from queue [${queue}]:`, error);
                    channel.nack(msg, false, false);
                }
            }
        });
        console.log(`🎧 Started consuming from queue [${queue}]`);
    }
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
