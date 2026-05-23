export async function up(knex) {
  await knex.schema.createTable("courses", function (table) {
    table.increments("id").primary();
    table.string("title", 200).notNullable();
    table.text("description");
    table.string("status", 30).notNullable().defaultTo("OPEN");
    table.integer("enrolled_count").notNullable().defaultTo(0);
    table.integer("capacity").notNullable().defaultTo(50);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("processed_events", function (table) {
    table.string("event_id", 100).primary();
    table.string("event_type", 100).notNullable();
    table.timestamp("processed_at").notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("processed_events");
  await knex.schema.dropTableIfExists("courses");
}