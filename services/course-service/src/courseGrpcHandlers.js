import grpc from "@grpc/grpc-js";

function toGrpcError(error) {
  if (error.code === "NOT_FOUND") {
    return { code: grpc.status.NOT_FOUND, message: error.message };
  }
  if (error.code === "INVALID_ARGUMENT") {
    return { code: grpc.status.INVALID_ARGUMENT, message: error.message };
  }
  return { code: grpc.status.INTERNAL, message: "Internal course service error" };
}

export function createCourseGrpcHandlers(courseService) {
  return {
    async getCourse(call, callback) {
      try {
        const course = await courseService.getCourse(call.request.id);
        callback(null, { course });
      } catch (error) {
        callback(toGrpcError(error));
      }
    },

    async listCourses(call, callback) {
      try {
        const result = await courseService.listCourses(call.request);
        callback(null, result);
      } catch (error) {
        callback(toGrpcError(error));
      }
    },

    async applyEnrollmentConfirmed(call, callback) {
      try {
        const result = await courseService.applyEnrollmentConfirmed(call.request);
        callback(null, result);
      } catch (error) {
        callback(toGrpcError(error));
      }
    }
  };
}
