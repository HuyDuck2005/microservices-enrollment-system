import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const studentProtoPath = path.resolve(__dirname, '../../protos/student.proto');
const courseProtoPath = path.resolve(__dirname, '../../protos/course.proto');
const enrollmentProtoPath = path.resolve(__dirname, '../../protos/enrollment.proto');

const loadOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

const studentDefinition = protoLoader.loadSync(studentProtoPath, loadOptions);
const courseDefinition = protoLoader.loadSync(courseProtoPath, loadOptions);
const enrollmentDefinition = protoLoader.loadSync(enrollmentProtoPath, loadOptions);

const studentProto = grpc.loadPackageDefinition(studentDefinition).student;
const courseProto = grpc.loadPackageDefinition(courseDefinition).course;
const enrollmentProto = grpc.loadPackageDefinition(enrollmentDefinition).enrollment;

const studentAddress = process.env.STUDENT_SERVICE_ADDR || process.env.STUDENT_GRPC_URL || 'localhost:50051';
const courseAddress = process.env.COURSE_SERVICE_ADDR || process.env.COURSE_GRPC_URL || 'localhost:50052';
const enrollmentAddress = process.env.ENROLLMENT_SERVICE_ADDR || process.env.ENROLLMENT_GRPC_URL || 'localhost:50053';

const studentClient = new studentProto.StudentService(
  studentAddress,
  grpc.credentials.createInsecure()
);

const courseClient = new courseProto.CourseService(
  courseAddress,
  grpc.credentials.createInsecure()
);

const enrollmentClient = new enrollmentProto.EnrollmentService(
  enrollmentAddress,
  grpc.credentials.createInsecure()
);

function createCircuitBreakerClient(client, options = {}) {
  const {
    timeoutMs = 5000,
    failureThreshold = 4,
    resetTimeoutMs = 10000
  } = options;

  const state = new Map();

  const getState = (method) => {
    if (!state.has(method)) {
      state.set(method, { failureCount: 0, openUntil: 0 });
    }
    return state.get(method);
  };

  const callMethod = (methodName, request) => {
    const methodState = getState(methodName);
    const now = Date.now();

    if (now < methodState.openUntil) {
      return Promise.reject(new Error(`${methodName} circuit breaker is open`));
    }

    return new Promise((resolve, reject) => {
      client[methodName](request, { deadline: now + timeoutMs }, (error, response) => {
        if (error) {
          methodState.failureCount += 1;
          if (methodState.failureCount >= failureThreshold) {
            methodState.openUntil = Date.now() + resetTimeoutMs;
          }
          reject(error);
          return;
        }

        methodState.failureCount = 0;
        resolve(response);
      });
    });
  };

  return new Proxy({}, {
    get(_, methodName) {
      return (request) => callMethod(methodName, request);
    }
  });
}

export const grpcClients = {
  studentClient: createCircuitBreakerClient(studentClient),
  courseClient: createCircuitBreakerClient(courseClient),
  enrollmentClient: createCircuitBreakerClient(enrollmentClient)
};

export const { studentClient: studentClientWithBreaker, courseClient: courseClientWithBreaker, enrollmentClient: enrollmentClientWithBreaker } = grpcClients;
