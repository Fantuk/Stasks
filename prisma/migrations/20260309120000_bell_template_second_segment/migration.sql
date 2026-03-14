-- Add nullable fields for the optional second segment of a lesson.
ALTER TABLE "bell_templates"
ADD COLUMN "second_start_time" TIMESTAMP(3),
ADD COLUMN "second_end_time" TIMESTAMP(3);

-- Remove the old composite unique index. It relied on nullable columns and did
-- not reliably protect against duplicates in PostgreSQL.
DROP INDEX IF EXISTS "bell_templates_group_id_schedule_type_specific_date_weekday_key";
DROP INDEX IF EXISTS "BellTemplate_groupId_scheduleType_specificDate_weekdayStart_key";

-- Keep the two segments consistent and ordered.
ALTER TABLE "bell_templates"
ADD CONSTRAINT "bell_templates_second_segment_presence_check"
CHECK (
  ("second_start_time" IS NULL AND "second_end_time" IS NULL)
  OR ("second_start_time" IS NOT NULL AND "second_end_time" IS NOT NULL)
);

ALTER TABLE "bell_templates"
ADD CONSTRAINT "bell_templates_first_segment_order_check"
CHECK ("start_time" < "end_time");

ALTER TABLE "bell_templates"
ADD CONSTRAINT "bell_templates_second_segment_order_check"
CHECK (
  "second_start_time" IS NULL
  OR "second_start_time" < "second_end_time"
);

ALTER TABLE "bell_templates"
ADD CONSTRAINT "bell_templates_segments_sequence_check"
CHECK (
  "second_start_time" IS NULL
  OR "end_time" <= "second_start_time"
);

-- Split uniqueness by schedule type and by whether the template is group-
-- specific or institution-wide so NULL values do not bypass uniqueness.
CREATE UNIQUE INDEX "bell_templates_date_group_scope_unique"
ON "bell_templates" ("institution_id", "group_id", "specific_date", "lesson_number")
WHERE "schedule_type" = 'date' AND "group_id" IS NOT NULL;

CREATE UNIQUE INDEX "bell_templates_date_institution_scope_unique"
ON "bell_templates" ("institution_id", "specific_date", "lesson_number")
WHERE "schedule_type" = 'date' AND "group_id" IS NULL;

CREATE UNIQUE INDEX "bell_templates_weekday_group_scope_unique"
ON "bell_templates" ("institution_id", "group_id", "weekday_start", "weekday_end", "lesson_number")
WHERE "schedule_type" = 'weekday' AND "group_id" IS NOT NULL;

CREATE UNIQUE INDEX "bell_templates_weekday_institution_scope_unique"
ON "bell_templates" ("institution_id", "weekday_start", "weekday_end", "lesson_number")
WHERE "schedule_type" = 'weekday' AND "group_id" IS NULL;
