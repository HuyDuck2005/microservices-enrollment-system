import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc 3 file hợp đồng
const studentProtoPath = path.resolve(__dirname, '../../protos/student.proto');
const courseProtoPath = path.resolve(__dirname, '../../protos/course.proto');
const enrollmentProtoPath = path.resolve(__dirname, '../../protos/enrollment.proto');

const loadOptions = { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true };

const studentPackage = protoLoader.loadSync(studentProtoPath, loadOptions);
const coursePackage = protoLoader.loadSync(courseProtoPath, loadOptions);
const enrollmentPackage = protoLoader.loadSync(enrollmentProtoPath, loadOptions);

const studentProto = grpc.loadPackageDefinition(studentPackage).student;
const courseProto = grpc.loadPackageDefinition(coursePackage).course;
const enrollmentProto = grpc.loadPackageDefinition(enrollmentPackage).enrollment;

// Kết nối tới 3 service
const studentClient = new studentProto.StudentService(
  process.env.STUDENT_GRPC_URL || 'localhost:50051',
  grpc.credentials.createInsecure()
);

const courseClient = new courseProto.CourseService(
  process.env.COURSE_GRPC_URL || 'localhost:50052',
  grpc.credentials.createInsecure()
);

const enrollmentClient = new enrollmentProto.EnrollmentService(
  process.env.ENROLLMENT_GRPC_URL || 'localhost:50053',
  grpc.credentials.createInsecure()
);

export const grpcClients = { studentClient, courseClient, enrollmentClient };
export { studentClient, courseClient, enrollmentClient };