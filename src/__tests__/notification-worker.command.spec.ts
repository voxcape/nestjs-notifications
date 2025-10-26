import { NotificationWorkerCommand } from '../commands/notification-worker.command';
import { NotificationWorkerService } from '../notification-worker.service';

describe('NotificationWorkerCommand', () => {
    let workerService: { start: jest.Mock };
    let command: NotificationWorkerCommand;

    beforeEach(() => {
        workerService = {
            start: jest.fn().mockResolvedValue(undefined),
        };
        command = new NotificationWorkerCommand(
            workerService as unknown as NotificationWorkerService,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('delegates to the worker service with the provided block timeout', async () => {
        await command.run([], { blockTimeout: 12 });

        expect(workerService.start).toHaveBeenCalledTimes(1);
        expect(workerService.start).toHaveBeenCalledWith(12);
    });

    it('passes undefined to the worker service when no block timeout option is supplied', async () => {
        await command.run([], {} as any);

        expect(workerService.start).toHaveBeenCalledTimes(1);
        expect(workerService.start).toHaveBeenCalledWith(undefined);
    });

    it('parses the block-timeout CLI option as a number', () => {
        expect(command.parseBlockTimeout('15')).toBe(15);
    });
});
