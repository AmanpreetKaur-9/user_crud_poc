import { DBManager } from './dbManager';
import http from 'http';
import net from 'net';
import nock from 'nock';
// import { AppBuilder } from '../../src/app'; // Your main express app factory

export class BaseTestCase {
    public app: any;
    public server!: http.Server;
    private dbName!: string;
    private port!: number;

    async setup() {
        // 1. Isolate External Services
        nock.disableNetConnect();
        nock.enableNetConnect('127.0.0.1'); // Allow local DB/app communication

        // 2. Provision DB
        this.dbName = await DBManager.provisionIsolatedDatabase();

        // 3. Environment Inject
        process.env.DB_NAME = this.dbName;

        // Disable external calls/queues via env injection
        process.env.ENABLE_EXTERNAL_MAILS = 'false';
        process.env.QUEUE_DRIVER = 'sync';

        // Set test env variables explicitly for MySQL connection
        process.env.DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1';
        process.env.DB_PORT = process.env.TEST_DB_PORT || '33066';
        process.env.DB_USER = process.env.TEST_DB_USER || 'root';
        process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'root';

        // 5. Build and Start Server
        // Require app here dynamically so that it picks up the newly injected process.env.DB_NAME
        // Because Jest runs files in isolation, this will initialize the DB pool connected to the isolated cloned DB.
        this.app = require('../../src/app');

        return new Promise((resolve) => {
            this.server = this.app.listen(0, () => {
                const address = this.server.address() as net.AddressInfo;
                if (address) {
                    this.port = address.port;
                    process.env.PORT = this.port.toString();
                }

                process.stdout.write(`\n================================\n`);
                process.stdout.write(`[BaseTestCase] Test Isolation Info:\n`);
                process.stdout.write(`Test Run DB Name: ${this.dbName}\n`);
                process.stdout.write(`Test Run Port:    ${this.port}\n`);
                process.stdout.write(`================================\n\n`);

                resolve(true);
            });
        });
    }

    async teardown() {
        // 1. Stop server
        if (this.server) {
            await new Promise<void>((resolve, reject) => {
                this.server.close((err) => (err ? reject(err) : resolve()));
            });
        }

        // 2. Clear Port
        if (this.port) {
            this.port = 0;
        }

        // 3. Drop isolated DB
        if (this.dbName) {
            await DBManager.dropIsolatedDatabase(this.dbName);
        }

        // Close mysql pool to prevent jest from hanging
        const pool = require('../../src/config/db');
        if (pool && pool.end) {
            try { await pool.end(); } catch (e) { } // Ignore if already closed
        }

        // 4. Clean mocks
        nock.cleanAll();
        nock.enableNetConnect();
    }
}
