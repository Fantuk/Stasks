-- CreateIndex: номер этажа уникален в рамках здания
CREATE UNIQUE INDEX "floors_building_id_number_key" ON "floors"("building_id", "number");

-- CreateIndex: название аудитории уникально в рамках этажа
CREATE UNIQUE INDEX "classrooms_floor_id_name_key" ON "classrooms"("floor_id", "name");
