export function createCourseService(courseRepository) {
  return {
    async getCourseById(id) {
      return courseRepository.getCourseById(id);
    },
    async updateEnrollmentCount(id, increment) {
      return courseRepository.updateEnrollmentCount(id, increment);
    }
  };
}