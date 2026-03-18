import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import fastifyCookie from '@fastify/cookie';

async function bootstrap() {
  // logger: false — HTTP-логи только через nestjs-pino (единый формат с приложением)
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.register(fastifyCookie);
  await app.register(helmet);
  await app.register(compress);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'https://project-jehtt.vercel.app'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
  });

  const config = new DocumentBuilder()
    .setTitle('Stasks API')
    .setDescription(
      'API системы Stasks.\n\n' +
        '**Формат ответов:**\n' +
        '- Успех: `{ success: true, data, message?, meta? }`. Поле `data` — объект сущности, массив (при списках) или null. Поле `meta` присутствует только при пагинации: `page`, `limit`, `total`, `totalPages`.\n\n' +
        '- Ошибка: `{ success: false, data: null, message, errors? }`. Массив `errors` (поле, сообщение) — при 400.\n\n' +
        '**Авторизация:** защищённые эндпоинты требуют заголовок `Authorization: Bearer <accessToken>`.\n\n' +
        'Типы и схемы всех полей описаны в разделе Schemas ниже.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' }, 'JWT')
    .addTag('Auth', 'Регистрация, вход и выход')
    .addTag('Users', 'Пользователи (поиск, CRUD, текущий пользователь)')
    .addTag('Groups', 'Группы и привязка студентов/кураторов')
    .addTag('Subjects', 'Предметы и привязка преподавателей/групп')
    .addTag('Teachers', 'Преподаватели')
    .addTag('Students', 'Студенты')
    .addTag('Moderators', 'Модераторы')
    .addTag('Buildings', 'Здания')
    .addTag('Floors', 'Этажи')
    .addTag('Classrooms', 'Аудитории')
    .addTag('Tokens', 'Токены')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  logger.log(`Application is running on: ${port}`);
}
bootstrap();
