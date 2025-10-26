import fg from 'fast-glob';
import * as fs from 'node:fs';
import path from 'path';
import { BaseNotification } from '../base-notification';
import { autoDiscoverNotifications } from '../notification-type-loader';
import { clearNotificationRegistry } from '../notification.registry';
import * as registry from '../notification.registry';

jest.mock('node:fs', () => ({
    existsSync: jest.fn(),
}));
jest.mock('fast-glob', () => jest.fn());

describe('notification-type-loader', () => {
    const mockGlob = fg as unknown as jest.MockedFunction<typeof fg>;
    const existsSyncMock = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;

    beforeEach(() => {
        clearNotificationRegistry();
        mockGlob.mockReset();
        existsSyncMock.mockReset();
    });

    afterEach(() => {
        clearNotificationRegistry();
        jest.restoreAllMocks();
    });

    it('skips discovery when no base directories exist', async () => {
        existsSyncMock.mockReturnValue(false);
        const registerSpy = jest.spyOn(registry, 'registerNotificationType');

        await autoDiscoverNotifications();

        expect(existsSyncMock).toHaveBeenCalled();
        expect(mockGlob).not.toHaveBeenCalled();
        expect(registerSpy).not.toHaveBeenCalled();
    });

    it('registers BaseNotification subclasses exported by discovered modules', async () => {
        const virtualDir = path.resolve(process.cwd(), '__virtual_notifications__');
        const tsOnlyPath = path.join(virtualDir, 'ts-only.notification.ts');
        const jsOnlyPath = path.join(virtualDir, 'js-only.notification.js');
        const invalidPath = path.join(virtualDir, 'invalid.notification.js');

        existsSyncMock.mockImplementation((target) => {
            if (typeof target !== 'string') {
                return false;
            }
            return target === virtualDir;
        });

        jest.doMock(
            tsOnlyPath,
            () => {
                class TsOnlyNotification extends BaseNotification {
                    static type = 'ts-only';
                }
                class NotSubclass {}
                return { TsOnlyNotification, NotSubclass };
            },
            { virtual: true },
        );

        jest.doMock(
            jsOnlyPath,
            () => {
                class JsOnlyNotification extends BaseNotification {}
                return { JsOnlyNotification };
            },
            { virtual: true },
        );

        jest.doMock(invalidPath, () => ({ plain: 'value' }), { virtual: true });

        mockGlob.mockResolvedValue([tsOnlyPath, jsOnlyPath, invalidPath]);

        const registerSpy = jest.spyOn(registry, 'registerNotificationType');

        await autoDiscoverNotifications({ directories: ['__virtual_notifications__'] });

        expect(registerSpy).toHaveBeenCalledTimes(2);
        expect(registerSpy).toHaveBeenCalledWith('ts-only', expect.any(Function));
        expect(registerSpy).toHaveBeenCalledWith('JsOnlyNotification', expect.any(Function));
    });

    it('skips TypeScript files when a matching JavaScript build is present', async () => {
        const virtualDir = path.resolve(process.cwd(), '__virtual_prefer__');
        const basePath = path.join(virtualDir, 'prefer.notification');
        const tsPath = `${basePath}.ts`;
        const jsPath = `${basePath}.js`;

        existsSyncMock.mockImplementation((target) => {
            if (typeof target !== 'string') {
                return false;
            }
            return target === virtualDir || target === jsPath;
        });

        jest.doMock(
            tsPath,
            () => {
                class PreferNotification extends BaseNotification {
                    static type = 'prefer-js';
                }
                return { PreferNotification };
            },
            { virtual: true },
        );

        mockGlob.mockResolvedValue([tsPath]);

        const registerSpy = jest.spyOn(registry, 'registerNotificationType');

        await autoDiscoverNotifications({ directories: ['__virtual_prefer__'] });

        expect(registerSpy).not.toHaveBeenCalled();
        expect(existsSyncMock).toHaveBeenCalledWith(jsPath);
    });
});
