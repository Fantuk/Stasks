# Параметр `include` в API

Параметр query `include` позволяет подгружать связанные сущности в ответ. Допустимые значения зависят от ресурса.

| Ресурс | Эндпоинты | Допустимые значения | Что добавляется в ответ |
|--------|-----------|---------------------|-------------------------|
| **User** | GET /users/:id, GET /users/search, GET /users, GET /auth/me | `student`, `teacher`, `moderator`, `profiles` | Профили ролей (student/teacher/moderator). `profiles` раскрывается в все три. |
| **Group** | GET /group/:id | `user`, `members`, `teachers`, `groups` | `members` — студенты и куратор (teacher + students). Остальные — по смыслу ресурса. |
| **Building** | GET /building/:id | `floors`, `floors.classrooms` | Вложенные этажи; `floors.classrooms` — этажи с аудиториями (дерево здание → этажи → аудитории). |
| **Floor** | GET /floor/:id | `classrooms` | Список аудиторий этажа. |
| **Classroom** | GET /classroom/:id | `floor` | Объект этажа. |
| **Student** | GET /student?groupId=..., GET /student/:userId | `user` | Данные пользователя (ФИО, email и т.д.). |
| **Teacher** | GET /teacher/:userId, GET /teacher | `user` | Данные пользователя. |
| **Moderator** | GET /moderator/:userId, GET /moderator | `user` | Данные пользователя. |
| **Schedule** | GET /schedule, GET /schedule/:id | query `expand` (не include) | `expand=subject,group,teacher,classroom` — вложенные объекты (id, name) в каждое занятие. |

Значения передаются через запятую, например: `?include=user,profiles` или `?include=floors.classrooms`.
