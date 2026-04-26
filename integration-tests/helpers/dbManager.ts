import { createConnection } from 'mysql2/promise';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export class DBManager {
    private static get baseConfig() {
        return {
            host: process.env.TEST_DB_HOST || '127.0.0.1',
            port: parseInt(process.env.TEST_DB_PORT || '33066', 10),
            user: process.env.TEST_DB_USER || 'root',
            password: process.env.TEST_DB_PASSWORD || 'root'
        };
    }

    /**
     * Clones the template DB into a highly isolated DB for the current test file.
     * Includes retry logic for transient database connection faults.
     */
    static async provisionIsolatedDatabase(): Promise<string> {
        const cloneName = `test_db_${crypto.randomUUID().replace(/-/g, '')}`;
        if (process.env.DEBUG === 'true') {
            process.stdout.write(`\n======================================================\n`);
            process.stdout.write(`[DBManager] 🗄️  Creating isolated database clone: ${cloneName}\n`);
            process.stdout.write(`======================================================\n\n`);
        }
        let retries = 2;

        while (retries >= 0) {
            try {
                // Connect to master to create the database
                const masterConnection = await createConnection(this.baseConfig);
                await masterConnection.query(`CREATE DATABASE IF NOT EXISTS ${cloneName}`);
                await masterConnection.end();

                // Connect to the newly created isolated database
                const cloneConnection = await createConnection({
                    ...this.baseConfig,
                    database: cloneName,
                    multipleStatements: true // Important for running SQL files with multiple statements
                });

                // Run Migrations (setup.sql)
                const setupSqlPath = path.resolve(__dirname, '../../sql/setup.sql');
                const setupSql = fs.readFileSync(setupSqlPath, 'utf8');

                // We must remove 'USE user_crud_db;' to not accidentally switch contexts back
                const cleanedSql = setupSql.replace(/USE user_crud_db;/gi, '');

                await cloneConnection.query(cleanedSql);

                await cloneConnection.end();
                return cloneName;
            } catch (err) {
                console.error("Database provisioning error:", err);
                if (retries === 0) throw err;
                retries--;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        throw new Error("Failed to provision database after retries.");
    }

    static async dropIsolatedDatabase(dbName: string): Promise<void> {
        if (process.env.DEBUG === 'true') {
            process.stdout.write(`\n[DBManager] 🗑️  Dropping isolated database: ${dbName}\n\n`);
        }
        const connection = await createConnection(this.baseConfig);
        await connection.query(`DROP DATABASE IF EXISTS ${dbName}`);
        await connection.end();
    }
}
