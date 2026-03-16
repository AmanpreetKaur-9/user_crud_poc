import net from 'net';

export class PortAllocator {
    private static usedPorts: Set<number> = new Set();
    private static readonly START_PORT = 40000;
    private static readonly END_PORT = 45000;

    static async getAvailablePort(): Promise<number> {
        for (let port = this.START_PORT; port <= this.END_PORT; port++) {
            if (this.usedPorts.has(port)) continue;

            const isAvailable = await this.checkPort(port);
            if (isAvailable) {
                this.usedPorts.add(port);
                return port;
            }
        }
        throw new Error('No available ports found for integration testing.');
    }

    static freePort(port: number): void {
        this.usedPorts.delete(port);
    }

    private static checkPort(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.unref();
            server.on('error', () => resolve(false));
            server.listen(port, () => {
                server.close(() => resolve(true));
            });
        });
    }
}
