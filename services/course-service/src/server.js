import path from "node:path";
import { fileURLToPath } from "node:url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { db } from "./db.js";
import { startHealthServer } from "./health.js";
import { createCourseRepository } from "./courseRepository.js"; 
import { createCourseService } from "./courseService.js"; 
import { createCourseGrpcHandlers } from "./courseGrpcHandlers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.resolve(__dirname, "../../../protos/course.proto");

// Load the protobuf definition
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { 
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true 
});
const courseProto = grpc.loadPackageDefinition(packageDefinition).course;

// Create the repository, service, and gRPC handlers
const repository = createCourseRepository(db);
const service = createCourseService(repository);
const handlers = createCourseGrpcHandlers(service);

// Create the gRPC server
const grpcServer = new grpc.Server();
grpcServer.addService(courseProto.CourseService.service, handlers);

// Start the gRPC server and the health check server
const grpcAddress = process.env.GRPC_ADDRESS || "0.0.0.0:50052"; 
const healthPort = Number(process.env.HEALTH_PORT || 3002);

grpcServer.bindAsync(
  grpcAddress,
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    console.log(`course-service gRPC listening on ${grpcAddress}`);
    grpcServer.start();
  }
);

startHealthServer({
  serviceName: "course-service",
  port: healthPort,
  db
});

// Graceful Shutdown
process.on("SIGTERM", async () => {
  console.log("course-service received SIGTERM");
  grpcServer.tryShutdown(async () => {
    console.log("gRPC server closed.");
    await db.destroy();
    console.log("Database connection destroyed.");
    process.exit(0);
  });
});