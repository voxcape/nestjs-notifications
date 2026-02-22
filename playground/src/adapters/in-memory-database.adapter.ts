import { Injectable } from '@nestjs/common';
import { DatabaseAdapter, DatabaseRecord } from '@voxcape/nestjs-notifications';

@Injectable()
export class InMemoryDatabaseAdapter implements DatabaseAdapter {
    private readonly store: DatabaseRecord[] = [];

    async save(record: DatabaseRecord): Promise<void> {
        this.store.push(record);
        console.log('[InMemoryDatabaseAdapter] Stored notification:\n', JSON.stringify(record, null, 2));
    }

    getAll(): DatabaseRecord[] {
        return this.store;
    }
}
