import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadProto(relativePath, packageName, serviceName, address) {
  const protoPath = path.resolve(__dirname, '../../../protos', relativePath);
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  const loaded = grpc.loadPackageDefinition(packageDefinition);
  return new loaded[packageName][serviceName](address, grpc.credentials.createInsecure());
}

export const studentClient = loadProto(
  'student.proto', 'student', 'StudentService',
  process.env.STUDENT_GRPC_URL || 'localhost:50051'
);

export const courseClient = loadProto(
  'course.proto', 'course', 'CourseService',
  process.env.COURSE_GRPC_URL || 'localhost:50052'
);

export function callUnary(client, method, request, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const deadline = new Date(Date.now() + timeoutMs);
    client[method](request, { deadline }, (error, response) => {
      if (error) return reject(error);
      resolve(response);
    });
  });
}
