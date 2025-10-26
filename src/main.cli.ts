import { CommandFactory } from 'nest-commander';
import { NotificationModule } from './notification.module';

async function bootstrap() {
    await CommandFactory.run(NotificationModule.forRoot(), ['warn', 'error', 'debug', 'log']);
}
bootstrap();
