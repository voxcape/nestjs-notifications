import { Command, CommandRunner, Option } from 'nest-commander';
import { NotificationWorkerService } from '../notification-worker.service';

interface WorkerOptions {
    blockTimeout?: number;
}

@Command({
    name: 'notifications:work',
    description: 'Start the notification queue worker using the registered queue adapter.',
})
export class NotificationWorkerCommand extends CommandRunner {
    constructor(private readonly workerService: NotificationWorkerService) {
        super();
    }

    /**
     * Executes a worker to process notification jobs from a queue based on the provided options.
     * This method configures and manages the lifecycle of the worker, including handling system signals for graceful shutdown.
     *
     * @param _inputs - An array of string inputs (not currently used in this implementation).
     * @param options - Configuration options for the worker, including blocking timeout and other parameters.
     * @return A Promise that resolves when the worker has completed its operation and stopped.
     */
    async run(_inputs: string[], options: WorkerOptions): Promise<void> {
        await this.workerService.start(options.blockTimeout);
    }

    @Option({
        flags: '-t, --block-timeout [number]',
        description: 'Set blocking timeout (seconds) for dequeue operations (default: 5)',
    })
    parseBlockTimeout(value: string): number {
        return Number(value);
    }
}
