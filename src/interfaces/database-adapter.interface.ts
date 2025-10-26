import { DatabaseRecord } from '../types';

export interface DatabaseAdapter {
    /**
     * Saves a given record to the database.
     *
     * @param {DatabaseRecord} record - The record to be saved in the database.
     * @return {Promise<void>} A promise that resolves when the save operation is complete.
     */
    save(record: DatabaseRecord): Promise<void>;
}
