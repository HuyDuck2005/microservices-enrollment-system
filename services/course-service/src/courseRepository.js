export function createCourseRepository(db) {
  return {
    async getCourseById(id) {
      return db("courses").where({ id }).first();
    },
    async updateEnrollmentCount(id, increment) {
      return db("courses")
        .where({ id })
        .increment("enrolled_count", increment)
        .returning("*");
    }
  };
}