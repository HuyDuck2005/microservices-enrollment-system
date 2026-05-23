const TABLE_NAME = "students";

export function createStudentRepository(db) {
  return {
    async create(student) {
      await db(TABLE_NAME).insert(student);

      return this.findById(student.id);
    },

    async findById(id) {
      return db(TABLE_NAME)
        .select("id", "name", "email", "status")
        .where({ id })
        .first();
    },

    async findByEmailWithPassword(email) {
      return db(TABLE_NAME)
        .select("id", "name", "email", "password")
        .where({ email })
        .first();
    },

    async findAll({ limit, offset }) {
      return db(TABLE_NAME)
        .select("id", "name", "email", "status")
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset);
    },

    async countAll() {
      const row = await db(TABLE_NAME).count({ count: "*" }).first();
      return Number(row.count);
    },

    async findByIds(ids) {
      if (!ids || ids.length === 0) return [];

      return db(TABLE_NAME)
        .select("id", "name", "email")
        .whereIn("id", ids);
    }
  };
}