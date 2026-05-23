import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCircuitBreakerClient } from './circuitBreakers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTOS_DIR = path.resolve(__dirname, '../../../protos');

const studentProtoPath = path.resolve(PROTOS_DIR, 'student.proto');
const courseProtoPath = path.resolve(PROTOS_DIR, 'course.proto');

const loadOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

const studentDefinition = protoLoader.loadSync(studentProtoPath, loadOptions);
const courseDefinition = protoLoader.loadSync(courseProtoPath, loadOptions);

const studentProto = grpc.loadPackageDefinition(studentDefinition).student;
const courseProto = grpc.loadPackageDefinition(courseDefinition).course;

const studentAddress = process.env.STUDENT_SERVICE_ADDR || process.env.STUDENT_GRPC_URL || 'localhost:50051';
const courseAddress = process.env.COURSE_SERVICE_ADDR || process.env.COURSE_GRPC_URL || 'localhost:50052';

const rawStudentClient = new studentProto.StudentService(
  studentAddress,
  grpc.credentials.createInsecure()
);

const rawCourseClient = new courseProto.CourseService(
  courseAddress,
  grpc.credentials.createInsecure()
);

export const studentClient = createCircuitBreakerClient(rawStudentClient, {
  timeoutMs: 5000,
  failureThreshold: 5,
  resetTimeoutMs: 15000
});

export const courseClient = createCircuitBreakerClient(rawCourseClient, {
  timeoutMs: 5000,
  failureThreshold: 5,
  resetTimeoutMs: 15000
});

export const getStudent = (request) => studentClient.getStudent(request);
export const getCourse = (request) => courseClient.getCourse(request);
