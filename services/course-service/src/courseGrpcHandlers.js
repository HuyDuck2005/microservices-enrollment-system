import grpc from "@grpc/grpc-js";

export function createCourseGrpcHandlers(courseService) {
  return {
    GetCourse: async (call, callback) => {
      try {
        const course = await courseService.getCourseById(call.request.id);
        if (!course) {
          return callback({
            code: grpc.status.NOT_FOUND,
            details: "Course not found",
          });
        }
        callback(null, course);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin khóa học:", error);
        callback({
          code: grpc.status.INTERNAL,
          details: error.message,
        });
      }
    }
  };
}