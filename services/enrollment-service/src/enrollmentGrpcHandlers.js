import grpc from "@grpc/grpc-js";

export function createEnrollmentGrpcHandlers(enrollmentService) {
  return {
    CreateEnrollment: async (call, callback) => {
      try {
        const { student_id, course_id } = call.request;
        const result = await enrollmentService.createEnrollment(student_id, course_id);
        
        // Trả kết quả về thành công
        callback(null, result);
      } catch (error) {
        console.error("Lỗi khi tạo Enrollment:", error);
        callback({
          code: grpc.status.INTERNAL,
          details: error.message
        });
      }
    }
  };
}