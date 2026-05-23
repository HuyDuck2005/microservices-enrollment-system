import { studentClient, courseClient, enrollmentClient } from './grpcClients.js';

// Hàm hỗ trợ gọi gRPC bằng Promise
const grpcCall = (client, method, request) => {
  return new Promise((resolve, reject) => {
    client[method](request, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
};

export const resolvers = {
  Query: {
    student: async (_, { id }) => grpcCall(studentClient, 'GetStudent', { id }),
    course: async (_, { id }) => grpcCall(courseClient, 'GetCourse', { id }),
  },
  Mutation: {
    createEnrollment: async (_, { input }) => {
      const { studentId, courseId } = input;
      // Gọi sang enrollment-service
      const response = await grpcCall(enrollmentClient, 'CreateEnrollment', { 
        student_id: studentId, 
        course_id: courseId 
      });
      
      // Định dạng lại dữ liệu trả về cho GraphQL
      return {
        id: response.id,
        studentId: response.student_id,
        courseId: response.course_id,
        status: response.status
      };
    }
  },
  // Giải quyết các Field liên kết (Relations)
  Enrollment: {
    student: async (parent) => grpcCall(studentClient, 'GetStudent', { id: parent.studentId }),
    course: async (parent) => grpcCall(courseClient, 'GetCourse', { id: parent.courseId }),
  }
};