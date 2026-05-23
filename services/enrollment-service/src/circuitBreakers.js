import CircuitBreaker from "opossum";
import { studentClient, courseClient, callUnary } from "./grpcClients.js";

const studentBreaker = new CircuitBreaker(
  (request) => callUnary(studentClient, "getStudent", request, 1200),
  {
    timeout: 1500,
    errorThresholdPercentage: 50,
    resetTimeout: 5000
  }
);

const courseBreaker = new CircuitBreaker(
  (request) => callUnary(courseClient, "getCourse", request, 1200),
  {
    timeout: 1500,
    errorThresholdPercentage: 50,
    resetTimeout: 5000
  }
);

studentBreaker.fallback(() => {
  const error = new Error("Student service unavailable");
  error.code = "UNAVAILABLE";
  throw error;
});

courseBreaker.fallback(() => {
  const error = new Error("Course service unavailable");
  error.code = "UNAVAILABLE";
  throw error;
});

export const studentGateway = {
  async getStudent(id) {
    const response = await studentBreaker.fire({ id });
    return response.student;
  }
};

export const courseGateway = {
  async getCourse(id) {
    const response = await courseBreaker.fire({ id });
    return response.course;
  }
};
