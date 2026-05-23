import grpc from "@grpc/grpc-js";

function toGrpcError(error) {
  const statusMap = {
    NOT_FOUND: grpc.status.NOT_FOUND,
    ALREADY_EXISTS: grpc.status.ALREADY_EXISTS,
    FAILED_PRECONDITION: grpc.status.FAILED_PRECONDITION,
    UNAVAILABLE: grpc.status.UNAVAILABLE,
    INVALID_ARGUMENT: grpc.status.INVALID_ARGUMENT
  };
  return {
    code: statusMap[error.code] || grpc.status.INTERNAL,
    message: error.message || "Internal enrollment service error"
  };
}

export function createEnrollmentGrpcHandlers(enrollmentService) {
  return {
    async createEnrollment(call, callback) {
      try {
        const enrollment = await enrollmentService.createEnrollment(call.request);
        callback(null, {
          enrollment: {
            id: enrollment.id,
            student_id: enrollment.student_id,
            course_id: enrollment.course_id,
            status: enrollment.status
          }
        });
      } catch (error) {
        callback(toGrpcError(error));
      }
    },

    async listEnrollmentsByStudent(call, callback) {
      try {
        const enrollments = await enrollmentService.listEnrollmentsByStudent(call.request);
        callback(null, { enrollments });
      } catch (error) {
        callback(toGrpcError(error));
      }
    }
  };
}
