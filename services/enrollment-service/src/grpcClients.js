import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import CircuitBreaker from "opossum";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Timeout config từ env ────────────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS    = Number(process.env.GRPC_TIMEOUT_MS            || 1500);
const ENROLLMENT_TIMEOUT_MS = Number(process.env.GRPC_ENROLLMENT_TIMEOUT_MS || 2500);

// ─── Helper: load proto ───────────────────────────────────────────────────────
function loadProto(relativeProtoPath, packageName) {
  const protoPath = path.resolve(__dirname, "../../protos", relativeProtoPath);
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs:    String,
    enums:    String,
    defaults: true,
    oneofs:   true
  });
  return grpc.loadPackageDefinition(packageDefinition)[packageName];
}

// ─── Helper: gọi unary với deadline ──────────────────────────────────────────
function callUnaryWithDeadline(client, methodName, request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = new Date(Date.now() + timeoutMs);
    client[methodName](request, { deadline }, (error, response) => {
      if (error) { reject(error); return; }
      resolve(response);
    });
  });
}

// ─── Tạo caller thường (không có breaker) ─────────────────────────────────────
function createUnaryCaller(client, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  return function call(methodName, request, overrideOptions = {}) {
    const effectiveTimeout = overrideOptions.timeoutMs || timeoutMs;
    return callUnaryWithDeadline(client, methodName, request, effectiveTimeout);
  };
}

// ─── Tạo caller có Circuit Breaker bằng opossum ───────────────────────────────
// Mỗi methodName có 1 breaker riêng (lazy-init), tránh shared state.
function createCircuitBreakerCaller(client, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const breakers  = new Map();

  return function call(methodName, request, overrideOptions = {}) {
    const effectiveTimeout = overrideOptions.timeoutMs || timeoutMs;

    if (!breakers.has(methodName)) {
      const breaker = new CircuitBreaker(
        (payload) => callUnaryWithDeadline(client, methodName, payload, effectiveTimeout),
        {
          timeout:                  effectiveTimeout + 300, // buffer nhỏ hơn deadline
          errorThresholdPercentage: 50,
          resetTimeout:             5000
        }
      );

      breaker.fallback(() => {
        const error     = new Error(`${methodName} service call unavailable`);
        error.code      = grpc.status.UNAVAILABLE;
        error.details   = `${methodName} service call unavailable`;
        throw error;
      });

      breakers.set(methodName, breaker);
    }

    return breakers.get(methodName).fire(request);
  };
}

// ─── Khởi tạo proto clients ───────────────────────────────────────────────────
const studentProto    = loadProto("student.proto",    "student");
const courseProto     = loadProto("course.proto",     "course");
const enrollmentProto = loadProto("enrollment.proto", "enrollment");

const studentRawClient = new studentProto.StudentService(
  process.env.STUDENT_SERVICE_ADDR || "localhost:50051",
  grpc.credentials.createInsecure()
);

const courseRawClient = new courseProto.CourseService(
  process.env.COURSE_SERVICE_ADDR || "localhost:50052",
  grpc.credentials.createInsecure()
);

const enrollmentRawClient = new enrollmentProto.EnrollmentService(
  process.env.ENROLLMENT_SERVICE_ADDR || "localhost:50053",
  grpc.credentials.createInsecure()
);

// ─── Export: mỗi service có .call (có breaker) và .callWithoutBreaker ─────────
export const grpcClients = {
  student: {
    raw:                studentRawClient,
    call:               createCircuitBreakerCaller(studentRawClient,    { timeoutMs: DEFAULT_TIMEOUT_MS }),
    callWithoutBreaker: createUnaryCaller(studentRawClient,             { timeoutMs: DEFAULT_TIMEOUT_MS })
  },
  course: {
    raw:                courseRawClient,
    call:               createCircuitBreakerCaller(courseRawClient,     { timeoutMs: DEFAULT_TIMEOUT_MS }),
    callWithoutBreaker: createUnaryCaller(courseRawClient,              { timeoutMs: DEFAULT_TIMEOUT_MS })
  },
  enrollment: {
    raw:                enrollmentRawClient,
    call:               createCircuitBreakerCaller(enrollmentRawClient, { timeoutMs: ENROLLMENT_TIMEOUT_MS }),
    callWithoutBreaker: createUnaryCaller(enrollmentRawClient,          { timeoutMs: ENROLLMENT_TIMEOUT_MS })
  }
};

export { grpc };