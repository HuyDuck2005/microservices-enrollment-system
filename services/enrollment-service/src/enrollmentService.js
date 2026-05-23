import crypto from "node:crypto";

export function createEnrollmentService({
  enrollmentRepository,
  studentGateway,
  courseGateway
}) {
  return {
    async createEnrollment({ student_id, course_id }) {
      const student = await studentGateway.getStudent(student_id);
      if (!student || student.status !== "ACTIVE") {
        const error = new Error("Student is not active");
        error.code = "FAILED_PRECONDITION";
        throw error;
      }

      const course = await courseGateway.getCourse(course_id);
      if (!course || course.status !== "OPEN") {
        const error = new Error("Course is not open");
        error.code = "FAILED_PRECONDITION";
        throw error;
      }

      if (course.enrolled_count >= course.capacity) {
        const error = new Error("Course is full");
        error.code = "FAILED_PRECONDITION";
        throw error;
      }

      const eventId = crypto.randomUUID();

      try {
        return await enrollmentRepository.createEnrollmentWithOutbox({
          studentId: student_id,
          courseId: course_id,
          eventId
        });
      } catch (error) {
        if (error.code === "23505") {
          const duplicated = new Error("Student already enrolled in course");
          duplicated.code = "ALREADY_EXISTS";
          throw duplicated;
        }
        throw error;
      }
    },

    async listEnrollmentsByStudent({ student_id }) {
      return enrollmentRepository.findByStudentId(student_id);
    }
  };
}
