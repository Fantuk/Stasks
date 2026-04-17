# Stasks API

`Stasks` — backend-сервис системы учебного расписания и организационной структуры: пользователи/роли, группы, предметы, преподаватели/кураторы, студенты, здания/этажи/аудитории и расписание занятий (с шаблонами звонков).

## Быстрый старт

### 1) Настройте окружение

В корне проекта обновите `.env`.

Используются переменные:

- `DATABASE_URL` — PostgreSQL
- `PORT` — порт (в коде дефолт используется `3001`)
- `CLIENT_URL` — origin для CORS
- `JWT_SECRET` — секрет JWT
- `JWT_EXPIRES_IN` — срок жизни accessToken
- `REFRESH_TOKEN_EXPIRES_VALUE`, `REFRESH_TOKEN_EXPIRES_UNIT` — срок жизни refreshToken
- `SALT` — параметр для хеширования паролей
- `LOG_LEVEL` — уровень логов

### 2) Установите зависимости

```bash
pnpm install
```

### 3) Запуск

```bash
# dev (TypeScript)
pnpm run start

# dev watch
pnpm run server

# production
pnpm run build
pnpm run start:prod
```

## Swagger

- Swagger UI: `GET /docs`
- Базовый префикс API: `/api`

## Авторизация

### accessToken (JWT)

Для защищенных эндпоинтов передавайте:

- `Authorization: Bearer <accessToken>`

### refreshToken (cookie)

Refresh-токен хранится в cookie `refreshToken` и ставится как `httpOnly` (в production дополнительно используется `secure`).

Полезные эндпоинты:

- `GET /api/token/refresh-tokens` — обновляет токены, используя refreshToken из cookie
- `POST /api/auth/logout` — завершение с очисткой refreshToken cookie
- `POST /api/token/remove` — удаление refreshToken (cookie + запись в БД)

## Формат ответов и ошибок

### Успех

Сервис оборачивает ответы в единый формат:

```json
{ "success": true, "data": {...}, "message": "..." }
```

Для списков добавляется `meta`:

- `page`, `limit`, `total`, `totalPages`

### Ошибка

```json
{
  "success": false,
  "data": null,
  "message": "Ошибка валидации данных",
  "code": "VALIDATION_ERROR",
  "errors": [{ "field": "email", "message": "..." }]
}
```

### Коды ошибок (`code`)

Возможные значения:

- `VALIDATION_ERROR` (обычно `400`, детализация в `errors`)
- `BAD_REQUEST` (`400`)
- `UNAUTHORIZED` (`401`)
- `FORBIDDEN` (`403`)
- `NOT_FOUND` (`404`)
- `CONFLICT` (`409`)
- `INTERNAL_ERROR` (`5xx`)

### Валидация входных данных

Глобально включена строгая валидация (`ValidationPipe`):

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

Поэтому “лишние” поля в `body`/`query` обычно приводят к `400` и `code: VALIDATION_ERROR`.

### Конфликты (`409`)

При бронировании занятого ресурса (аудитория/учитель заняты) возвращается:

- HTTP `409`
- `code: "CONFLICT"`
- `conflict` с деталями

Типы конфликта:

- `CLASSROOM_OCCUPIED`
- `TEACHER_OCCUPIED`

## include / expand

### `include`

`include` — comma-separated подгрузка связей в ответе для некоторых GET-эндпоинтов.

Таблица допустимых значений:

| Ресурс | Эндпоинты | Допустимые значения | Что добавляется в ответ |
|--------|-----------|---------------------|-------------------------|
| **User** | `GET /users/:id`, `GET /users/search`, `GET /users`, `GET /auth/me` | `student`, `teacher`, `moderator`, `profiles` | Профили ролей (student/teacher/moderator). `profiles` раскрывается в все три. |
| **Group** | `GET /group/:id` | `user`, `members`, `teachers`, `groups` | `members` — студенты и куратор (teacher + students). Остальные — по смыслу ресурса. |
| **Building** | `GET /building/:id` | `floors`, `floors.classrooms` | Вложенные этажи; `floors.classrooms` — этажи с аудиториями (дерево здание → этажи → аудитории). |
| **Floor** | `GET /floor/:id` | `classrooms` | Список аудиторий этажа. |
| **Classroom** | `GET /classroom/:id` | `floor` | Объект этажа. |
| **Student** | `GET /student?groupId=...`, `GET /student/:userId` | `user` | Данные пользователя. |
| **Teacher** | `GET /teacher/:userId`, `GET /teacher` | `user` | Данные пользователя. |
| **Moderator** | `GET /moderator/:userId`, `GET /moderator` | `user` | Данные пользователя. |
| **Schedule** | `GET /schedule`, `GET /schedule/:id` | query `expand` (не include) | `expand=subject,group,teacher,classroom` — вложенные объекты в каждое занятие. |

Примеры:

- `?include=user,profiles`
- `?include=floors.classrooms`

Допустимые значения по ресурсам: `docs/api-includes.md`.

### `expand` (расписание)

Для расписания `expand` принимает:

- `subject`, `group`, `teacher`, `classroom`

Пример:

- `GET /api/schedule?groupId=1&dateFrom=...&dateTo=...&expand=subject,teacher`

## Пагинация и сортировка

Для списков используются:

- `page` (>= 1)
- `limit`
- `sort` (зависит от эндпоинта)
- `order` (`asc`/`desc`)

Ограничения:

- базовый `limit` (в `PaginationDto`) <= `100`
- в некоторых списках max увеличен до `500`:
  - `GET /api/group`
  - `GET /api/bell-template`

## Принципы API

### Скоуп данных по `institutionId`

JWT формирует `request.user` (`IAccessToken`), включая:

- `userId`
- `institutionId`
- `roles`

Дальше бизнес-логика в сервисах всегда использует `institutionId`, чтобы пользователь видел только данные своего учреждения.

### RBAC (роли) и “модераторские права”

Проверки ролей делаются через:

- `JwtAuthGuard`
- `RolesGuard` + декоратор `@Roles(...)`
- дополнительные модераторские права — через `ModeratorPermissions` (пример: `canRegisterUsers`)

### Кэширование справочников

Для GET (без персональных данных) выставляется:

- `Cache-Control: private, max-age=60`
- по префиксам: `/api/building`, `/api/floor`, `/api/classroom`, `/api/subject`, `/api/group`

### Rate limit и CORS

rate limit:

- `100` запросов за `1 minute`

CORS:

- `credentials: true`
- allowed origins берутся из `CLIENT_URL` (и доп. prod-origin в коде)

## Эндпоинты (детально)

> Полную спецификацию DTO/полей сверяйте в Swagger: `GET /docs`.

### Auth

Публично:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/register`

`POST /api/auth/login` (LoginDto):

```json
{ "email": "user@example.com", "password": "password123" }
```

`POST /api/auth/register` (CreateUserDto):

```json
{
  "name": "Иван",
  "surname": "Иванов",
  "patronymic": "Иванович",
  "email": "user@example.com",
  "password": "password123",
  "roles": ["STUDENT"]
}
```

После `login` refresh-токен кладется в cookie `refreshToken`.

### Tokens

- `GET /api/token/refresh-tokens` — refreshToken из cookie
- `POST /api/token/remove` — очистка cookie + удаление refreshToken в БД

### Users (ADMIN/MODERATOR)

- `GET /api/users` — список с пагинацией
- `GET /api/users/search?query=...` — поиск с пагинацией, опционально `roles` и `include`
- `GET /api/users/me` — текущий пользователь
- `PATCH /api/users/me` — обновить ФИО/email (UpdateMeDto)
- `PATCH /api/users/me/password` — сменить пароль (ChangePasswordDto)
- `GET /api/users/:id?include=...`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Groups (ADMIN/MODERATOR)

Список/поиск:

- `GET /api/group` — пагинация (max `limit <= 500`)
- `GET /api/group/search?query=...`
- `GET /api/group/by-name?name=...` (обязателен `name`)

CRUD:

- `POST /api/group` — `{ "name": "ИС-41" }`
- `GET /api/group/:id?include=...`
- `PATCH /api/group/:id`
- `DELETE /api/group/:id`

Привязки:

- куратор:
  - `POST /api/group/:id/teacher` — `{ "teacherUserId": 1 }`
  - `DELETE /api/group/:id/teacher`
- студенты:
  - `POST /api/group/:id/students` — `{ "studentUserIds": [1,2,3] }`
  - `DELETE /api/group/:id/students`

Предметы:

- `GET /api/group/:id/subjects`

### Subjects (ADMIN/MODERATOR)

CRUD:

- `POST /api/subject` — `{ "name": "Математика" }`
- `GET /api/subject` — список (опционально `groupId`)
- `GET /api/subject/search?query=...`
- `GET /api/subject/:id?include=...`
- `PATCH /api/subject/:id`
- `DELETE /api/subject/:id`
- `GET /api/subject/by-name?name=...`

Привязки:

- преподаватели:
  - `POST /api/subject/:id/teachers` — `{ "teacherIds": [1,2] }`
  - `DELETE /api/subject/:id/teachers/:teacherId`
- группы:
  - `POST /api/subject/:id/groups` — `{ "groupIds": [1,2] }`
  - `DELETE /api/subject/:id/groups/:groupId`

### Teachers (ADMIN/MODERATOR)

Список/поиск:

- `GET /api/teacher?query=...&page=...&limit=...`
- `GET /api/teacher/:userId?include=...`

Кураторство:

- `PATCH /api/teacher/:userId/mentored-group` — `{ "groupId": 1 }`
- `DELETE /api/teacher/:userId/mentored-group`

### Students (ADMIN/MODERATOR)

Список группы:

- `GET /api/student?groupId=...&include=...` (groupId обязателен)

Профиль:

- `GET /api/student/:userId?include=...`

Привязка:

- `PATCH /api/student/:userId/group` — `{ "groupId": 1 }`
- `DELETE /api/student/:userId/group`

### Moderators (ADMIN/MODERATOR)

- `GET /api/moderator?query=...&page=...&limit=...`
- `GET /api/moderator/:userId?include=...`
- `PATCH /api/moderator/:userId` — обновить `accessRights` (тело — объект, схема в Swagger)

### Buildings / Floors / Classrooms (ADMIN/MODERATOR)

Создание:

- `POST /api/building` — `{ "name": "Корпус A" }`
- `POST /api/floor` — `{ "buildingId": 1, "number": 1 }`
- `POST /api/classroom` — `{ "floorId": 1, "name": "101" }`

Поиск/списки:

- `GET /api/building/search?query=...`
- `GET /api/floor?buildingId=...&page=...&limit=...` (buildingId обязателен)
- `GET /api/classroom?floorId=...&page=...&limit=...` (floorId обязателен)

Получение по id:

- `GET /api/building/:id?include=floors.classrooms`
- `GET /api/floor/:id?include=classrooms`
- `GET /api/classroom/:id?include=floor`

### Bell Templates (ADMIN/MODERATOR)

CRUD:

- `POST /api/bell-template`
- `GET /api/bell-template?groupId=...&scheduleType=...&page=...&limit=...` (max `limit <= 500`)
- `GET /api/bell-template/:id`
- `PATCH /api/bell-template/:id`
- `DELETE /api/bell-template/:id`

Ключевые поля create/update:

- `scheduleType`: `date` или `weekday`
- при `date`: `specificDate`
- при `weekday`: `weekdayStart`, `weekdayEnd`
- общее: `lessonNumber`, `startTime`, `endTime`
- опционально/nullable: `groupId` (null = общий шаблон учреждения)
- опционально для 2-сегментных занятий: `secondStartTime`, `secondEndTime`

Bulk-сценарии:

- `PATCH /api/bell-template/bulk-scope`
  - body: `{ "filter": {...}, "update": {...} }`
- `DELETE /api/bell-template/bulk-scope`
  - body: `{ "filter": {...} }`

Если шаблоны используются в расписании — возможен `409` (`code: CONFLICT`).

### Schedule (ADMIN/MODERATOR)

Создание `POST /api/schedule` (CreateScheduleDto):

```json
{
  "subjectId": 1,
  "groupId": 1,
  "teacherId": 1,
  "type": "ONLINE",
  "classroomId": null,
  "bellTemplateId": 1,
  "lessonNumber": 1,
  "scheduleDate": "2025-03-05T00:00:00.000Z",
  "scheduleSlotId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Валидация шаблона/урока:

- либо `bellTemplateId`, либо `lessonNumber` (если bellTemplateId не указан)
- `type` опционален: `ONLINE`, `TEST`, `EXAM`, `DISTANCE`
- для `ONLINE` и `DISTANCE` поле `classroomId` должно быть `null` (занятие без аудитории)
- для `TEST`, `EXAM` или `type = null` аудитория допускается по общим правилам
- `scheduleSlotId` создает подгруппу к существующему занятию

Bulk создание `POST /api/schedule/bulk` (BulkCreateScheduleDto):

- те же ключевые поля + даты задаются либо:
  - `dates: [...]`
  - или `dateFrom` + `dateTo` (оба ISO, диапазон включительно)

Список/фильтры `GET /api/schedule`:

- `groupId`, `teacherId`, `classroomId`
- `dateFrom`, `dateTo`
- `expand=subject,group,teacher,classroom`
- `page`, `limit`, `sort` (`scheduleDate` или `id`), `order` (`asc`/`desc`)

Получение `GET /api/schedule/:id?expand=...`.

Обновление/удаление:

- `PATCH /api/schedule/:id` (UpdateScheduleDto — все поля опциональны)
- `DELETE /api/schedule/:id`

<!--
<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
-->
