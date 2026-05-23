import { readFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import 'dotenv/config';

const seedDataUrl = new URL("./data.json", import.meta.url);
const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS) || 10;

async function loadSeedData() {
  const rawData = await readFile(seedDataUrl, "utf8");
  return JSON.parse(rawData);
}

function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Password is required");
  }

  return bcrypt.hashSync(password, PASSWORD_SALT_ROUNDS);
}
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  const students = await loadSeedData();
  const studentRows = students.map((student) => ({
    ...student,
    password: hashPassword(student.password),
  }));

  await knex.transaction(async (trx) => {
    await trx("students").del();

    const insertedStudents = await trx("students")
      .insert(studentRows)
      .returning("*");
  });
};