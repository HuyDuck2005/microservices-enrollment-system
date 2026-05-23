const TABLE_NAME = "courses";
const PROCESSED_EVENTS_TABLE = "processed_events";

export function createCourseRepository(db) {
  return {
    async findById(id) {
      return db(TABLE_NAME)
        .select("id", "title", "description", "status", "enrolled_count", "capacity")
        .where({ id })
        .first();
    },

    async findAll({ limit, offset }) {
      return db(TABLE_NAME)
        .select("id", "title", "description", "status", "enrolled_count", "capacity")
        .orderBy("id", "asc")
        .limit(limit)
        .offset(offset);
    },

    async countAll() {
      const row = await db(TABLE_NAME).count({ count: "*" }).first();
      return Number(row.count);
    },

    async applyEnrollmentConfirmed({ eventId, enrollmentId, studentId, courseId }) {
      return db.transaction(async (trx) => {
        const processed = await trx(PROCESSED_EVENTS_TABLE)
          .where({ event_id: eventId })
          .first();

        if (processed) {
          return { alreadyProcessed: true };
        }

        const course = await trx(TABLE_NAME)
          .where({ id: courseId })
          .forUpdate()
          .first();

        if (!course) {
          const error = new Error("Course not found");
          error.code = "NOT_FOUND";
          throw error;
        }

        await trx(TABLE_NAME)
          .where({ id: courseId })
          .increment("enrolled_count", 1)
          .update({ updated_at: db.fn.now() });

        await trx(PROCESSED_EVENTS_TABLE).insert({
          event_id: eventId,
          event_type: "ENROLLMENT_CONFIRMED"
        });

        return { alreadyProcessed: false, enrollmentId, studentId, courseId };
      });
    }
  };
}
