import jwt from 'jsonwebtoken';
import { grpcClients } from './grpcClients.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const toPromise = (client, method, request) => {
  return client[method](request);
};

export const resolvers = {
  Query: {
    me: async (_, __, { currentStudentId }) => {
      if (!currentStudentId) return null;
      const response = await toPromise(grpcClients.studentClient, 'getStudent', { id: currentStudentId });
      return response?.student || null;
    },

    student: async (_, { id }) => {
      const response = await toPromise(grpcClients.studentClient, 'getStudent', { id });
      return response?.student || null;
    },

    students: async (_, { limit, offset }) => {
      const response = await toPromise(grpcClients.studentClient, 'listStudents', { limit, offset });
      return response?.students || [];
    },

    studentsPage: async (_, { limit, offset }) => {
      const response = await toPromise(grpcClients.studentClient, 'listStudents', { limit, offset });
      return {
        students: response?.students || [],
        pageInfo: response?.page_info || null
      };
    },

    course: async (_, { id }) => {
      const response = await toPromise(grpcClients.courseClient, 'getCourse', { id });
      return response?.course || null;
    },

    courses: async (_, { limit, offset }) => {
      const response = await toPromise(grpcClients.courseClient, 'listCourses', { limit, offset });
      return {
        courses: response?.courses || [],
        pageInfo: response?.page_info || null
      };
    },

    enrollmentsByStudent: async (_, { studentId }) => {
      const response = await toPromise(grpcClients.enrollmentClient, 'listEnrollmentsByStudent', { student_id: studentId });
      return response?.enrollments || [];
    },

    myEnrollments: async (_, __, { currentStudentId }) => {
      if (!currentStudentId) return [];
      const response = await toPromise(grpcClients.enrollmentClient, 'listEnrollmentsByStudent', { student_id: currentStudentId });
      return response?.enrollments || [];
    }
  },

  Mutation: {
    login: async (_, { email, password }) => {
      const response = await toPromise(grpcClients.studentClient, 'authenticateStudent', { email, password });

      if (!response?.success) {
        throw new Error(response?.message || 'Invalid credentials');
      }

      const token = jwt.sign({ sub: response.student.id }, JWT_SECRET, { expiresIn: '1h' });
      return {
        token,
        student: response.student
      };
    },

    createStudent: async (_, { input }) => {
      const response = await toPromise(grpcClients.studentClient, 'createStudent', input);
      return response?.student || null;
    },

    createEnrollment: async (_, { input }) => {
      const { studentId, courseId } = input;
      const response = await toPromise(grpcClients.enrollmentClient, 'createEnrollment', {
        student_id: studentId,
        course_id: Number(courseId)
      });
      return {
        id: response.id,
        studentId: response.student_id,
        courseId: String(response.course_id),
        status: response.status
      };
    },

    createMyEnrollment: async (_, { courseId }, { currentStudentId }) => {
      if (!currentStudentId) {
        throw new Error('Authentication required');
      }

      const response = await toPromise(grpcClients.enrollmentClient, 'createEnrollment', {
        student_id: currentStudentId,
        course_id: Number(courseId)
      });

      return {
        id: response.id,
        studentId: response.student_id,
        courseId: String(response.course_id),
        status: response.status
      };
    }
  },

  Course: {
    enrolledCount: (parent) => parent.enrolled_count,
    capacity: (parent) => parent.capacity
  },

  Enrollment: {
    student: async (parent) => {
      const response = await toPromise(grpcClients.studentClient, 'getStudent', { id: parent.studentId });
      return response?.student || null;
    },
    course: async (parent) => {
      const response = await toPromise(grpcClients.courseClient, 'getCourse', { id: parent.courseId });
      return response?.course || null;
    }
  }
};