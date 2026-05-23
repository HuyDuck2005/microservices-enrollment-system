export async function up(knex) {
  await knex.schema.createTable("enrollments", function (table) {
    table.increments("id").primary();
    table.integer("student_id").notNullable();
    table.integer("course_id").notNullable();
    table.string("status", 30).notNullable().defaultTo("CONFIRMED");
    table.timestamps(true, true);
    table.unique(["student_id", "course_id"]); // tránh đăng ký trùng
  });

  // Outbox pattern — lưu event chờ xử lý async
  await knex.schema.createTable("outbox_events", function (table) {
    table.string("event_id", 100).primary();
    table.string("event_type", 100).notNullable();
    table.string("aggregate_type", 100).notNullable();
    table.integer("aggregate_id").notNullable();
    table.jsonb("payload").notNullable();
    table.string("status", 30).notNullable().defaultTo("PENDING");
    table.integer("attempts").notNullable().defaultTo(0);
    table.text("last_error");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("processed_at");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("outbox_events");
  await knex.schema.dropTableIfExists("enrollments");
}