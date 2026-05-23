import crypto from 'node:crypto';

export function createEnrollmentRepository(db) {
  return {
    async findByStudentId(studentId) {
      const rows = await db('enrollments')
        .where({ student_id: studentId })
        .orderBy('created_at', 'desc');

      return rows.map((row) => ({
        id: String(row.id),
        student_id: String(row.student_id),
        course_id: row.course_id,
        status: row.status
      }));
    },

    async findPendingOutboxEvents() {
      return db('outbox_events')
        .where({ status: 'PENDING' })
        .orderBy('created_at', 'asc');
    },

    async markOutboxProcessed(eventId) {
      return db('outbox_events')
        .where({ event_id: eventId })
        .update({
          status: 'PROCESSED',
          processed_at: new Date()
        });
    },

    async markOutboxFailed(eventId, error, attempts) {
      const updateFields = {
        attempts,
        last_error: error
      };

      if (attempts >= 3) {
        updateFields.status = 'FAILED';
        updateFields.processed_at = new Date();
      }

      return db('outbox_events')
        .where({ event_id: eventId })
        .update(updateFields);
    },

    async createEnrollment(studentId, courseId) {
      const eventId = crypto.randomUUID();

      const enrollment = await db.transaction(async (trx) => {
        const existing = await trx('enrollments')
          .where({ student_id: studentId, course_id: courseId })
          .first();

        if (existing) {
          const error = new Error('Enrollment already exists');
          error.code = 'ALREADY_EXISTS';
          throw error;
        }

        const [created] = await trx('enrollments')
          .insert({
            student_id: studentId,
            course_id: courseId,
            status: 'CONFIRMED'
          })
          .returning('*');

        await trx('outbox_events').insert({
          event_id: eventId,
          event_type: 'EnrollmentCreated',
          aggregate_type: 'enrollment',
          aggregate_id: created.id,
          payload: {
            student_id: String(studentId),
            course_id: courseId,
            enrollment_id: created.id
          },
          status: 'PENDING',
          attempts: 0
        });

        return created;
      });

      return {
        id: String(enrollment.id),
        student_id: String(enrollment.student_id),
        course_id: enrollment.course_id,
        status: enrollment.status
      };
    }
  };
}
