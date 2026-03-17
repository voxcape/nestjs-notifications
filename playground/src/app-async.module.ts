import { Module } from '@nestjs/common';
import { NotificationModule, NotificationModuleOptions } from '@voxcape/nestjs-notifications';
import { InMemoryDatabaseAdapter } from './adapters/in-memory-database.adapter';

/**
 * Example AppModule using forRootAsync().
 *
 * This demonstrates the async configuration pattern — useful when your
 * adapter settings come from a ConfigService, environment, or any other
 * async source.
 */
@Module({
    imports: [
        NotificationModule.forRootAsync({
            useFactory: async (): Promise<NotificationModuleOptions> => {
                // Simulate loading config asynchronously (e.g. from ConfigService, vault, etc.)
                const config = await loadConfig();

                return {
                    databaseAdapter: config.databaseAdapterClass,
                    autoDiscoverNotifications: false,
                };
            },
        }),
    ],
})
export class AppAsyncModule {}

/**
 * Simulates fetching configuration from an async source.
 */
async function loadConfig() {
    return {
        databaseAdapterClass: InMemoryDatabaseAdapter,
    };
}
