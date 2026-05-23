import path from "node:path";
import { fileURLToPath } from "node:url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { db } from "./db.js";
import { startHealthServer } from "./health.js";

// Khai báo import - Hãy đảm bảo tên hàm khớp với file bạn copy từ PDF
import { createEnrollmentRepository } from "./enrollmentRepository.js";
import { createEnrollmentService } from "./enrollmentService.js";
import { createEnrollmentGrpcHandlers } from "./enrollmentGrpcHandlers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.resolve(__dirname, "../../../protos/enrollment.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, { 
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true 
});
const enrollmentProto = grpc.loadPackageDefinition(packageDefinition).enrollment;

// Khởi tạo các module
const repository = createEnrollmentRepository(db);
const service = createEnrollmentService(repository);
const handlers = createEnrollmentGrpcHandlers(service);

const grpcServer = new grpc.Server();
grpcServer.addService(enrollmentProto.EnrollmentService.service, handlers);

const grpcAddress = process.env.GRPC_ADDRESS || "0.0.0.0:50053"; 
const healthPort = Number(process.env.HEALTH_PORT || 3003);

grpcServer.bindAsync(
  grpcAddress,
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    console.log(`enrollment-service gRPC listening on ${grpcAddress}`);
  }
);

startHealthServer({
  serviceName: "enrollment-service",
  port: healthPort,
  db
});