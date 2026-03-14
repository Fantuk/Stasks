import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/user/application/user.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TokenModule } from 'src/token/application/token.module';
import { ModeratorModule } from 'src/moderator/application/moderator.module';
import { TeacherModule } from 'src/teacher/application/teacher.module';
import { StudentModule } from 'src/student/application/student.module';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from 'src/common/interceptors/response-transform.interceptor';
import { CacheControlInterceptor } from 'src/common/interceptors/cache-control.interceptor';
import { GroupModule } from './group/application/group.module';
import { SubjectModule } from './subject/application/subject.module';
import { BuildingModule } from './building/application/building.module';
import { FloorModule } from './floor/application/floor.module';
import { ClassroomModule } from './classroom/application/classroom.module';
import { BellTemplateModule } from './bell-template/application/bell-template.module';
import { ScheduleModule } from './schedule/application/schedule.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    TokenModule,
    ModeratorModule,
    TeacherModule,
    StudentModule,
    GroupModule,
    SubjectModule,
    BuildingModule,
    FloorModule,
    ClassroomModule,
    BellTemplateModule,
    ScheduleModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheControlInterceptor,
    },
  ],
})
export class AppModule {}
