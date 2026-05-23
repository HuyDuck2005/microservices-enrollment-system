/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable("students", table => {
    table.increments("id").primary();
    table.string("name", 150).notNullable();
    table.string("email", 150).notNullable().unique();
    table.string("password", 255).notNullable();
    table.string("status", 30).notNullable().defaultTo("ACTIVE"); // ← thêm mới
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("students");
};