export function createEnrollmentService(enrollmentRepository) {
  return {
    async createEnrollment(studentId, courseId) {
      return enrollmentRepository.createEnrollment(studentId, courseId);
    }
  };
}