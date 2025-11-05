import { DynamicModule, Type } from '@nestjs/common';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';

export interface ProviderOverride {
    token: string | symbol | Type<unknown>;
    useClass?: Type<unknown>;
    useValue?: unknown;
}

export interface TestModuleConfig {
    module: DynamicModule;
    overrides?: ProviderOverride[];
}

export class TestModuleHelper {
    private module!: TestingModule;

    async create(config: TestModuleConfig): Promise<TestingModule> {
        let builder: TestingModuleBuilder = Test.createTestingModule({
            imports: [config.module],
        });

        if (config.overrides) {
            for (const override of config.overrides) {
                const providerBuilder = builder.overrideProvider(override.token);

                if (override.useClass) {
                    builder = providerBuilder.useClass(override.useClass);
                } else if (override.useValue !== undefined) {
                    builder = providerBuilder.useValue(override.useValue);
                }
            }
        }

        this.module = await builder.compile();
        return this.module;
    }

    async cleanup(): Promise<void> {
        if (this.module) {
            await this.module.close();
        }
    }
}
