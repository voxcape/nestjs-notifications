import { Module } from '@nestjs/common';
import { DATABASE_ADAPTER, NotificationModule } from '@voxcape/nestjs-notifications';
import { InMemoryDatabaseAdapter } from './adapters/in-memory-database.adapter';

@Module({
    imports: [
        NotificationModule.forRoot({
            databaseAdapter: {
                provide: DATABASE_ADAPTER,
                useClass: InMemoryDatabaseAdapter,
            },
            autoDiscoverNotifications: false,
        }),
    ],
})
export class AppModule {}
