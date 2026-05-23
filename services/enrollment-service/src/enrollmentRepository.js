export function createEnrollmentRepository(db) {
  return {
    async createEnrollment(studentId, courseId) {
      // Lưu vào bảng enrollments
      const [enrollment] = await db("enrollments")
        .insert({ 
          student_id: studentId, 
          course_id: courseId, 
          status: "CONFIRMED" 
        })
        .returning("*");

      // Chuyển đổi định dạng ID sang chuỗi (string) để khớp với file .proto
      return {
        id: String(enrollment.id),
        student_id: String(enrollment.student_id),
        course_id: String(enrollment.course_id),
        status: enrollment.status
      };
    }
  };
}