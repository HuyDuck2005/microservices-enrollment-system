function normalizePagination(limit, offset) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  return { limit: safeLimit, offset: safeOffset };
}

function buildPageInfo({ total, limit, offset }) {
  return {
    total,
    limit,
    offset,
    has_next_page: offset + limit < total,
    has_previous_page: offset > 0
  };
}

export function createCourseService(courseRepository) {
  return {
    async getCourse(id) {
      const course = await courseRepository.findById(id);
      if (!course) {
        const error = new Error("Course not found");
        error.code = "NOT_FOUND";
        throw error;
      }
      return course;
    },

    async listCourses({ limit, offset }) {
      const pagination = normalizePagination(limit, offset);
      const [courses, total] = await Promise.all([
        courseRepository.findAll(pagination),
        courseRepository.countAll()
      ]);
      return {
        courses,
        page_info: buildPageInfo({
          total,
          limit: pagination.limit,
          offset: pagination.offset
        })
      };
    },

    async applyEnrollmentConfirmed(request) {
      const result = await courseRepository.applyEnrollmentConfirmed({
        eventId: request.event_id,
        enrollmentId: request.enrollment_id,
        studentId: request.student_id,
        courseId: request.course_id
      });

      if (result.alreadyProcessed) {
        return { success: true, message: "Event already processed" };
      }

      return { success: true, message: "Enrollment confirmed event applied" };
    }
  };
}
