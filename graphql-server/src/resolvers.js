import jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";
import { grpc } from "./grpcClients.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// ─── Map gRPC status → GraphQLError với extensions.code ──────────────────────
function toGraphQLError(error, fallbackMessage = "Internal server error") {
  if (error instanceof GraphQLError) throw error; // đừng wrap lại

  const grpcToGql = {
    [grpc.status.NOT_FOUND]:           ["NOT_FOUND",           error.details || error.message],
    [grpc.status.ALREADY_EXISTS]:      ["ALREADY_EXISTS",      error.details || error.message],
    [grpc.status.FAILED_PRECONDITION]: ["FAILED_PRECONDITION", error.details || error.message],
    [grpc.status.UNAVAILABLE]:         ["UNAVAILABLE",         error.details || "Service temporarily unavailable"],
    [grpc.status.UNAUTHENTICATED]:     ["UNAUTHENTICATED",     error.details || "Unauthenticated"],
    [grpc.status.PERMISSION_DENIED]:   ["FORBIDDEN",           error.details || "Permission denied"],
    [grpc.status.INVALID_ARGUMENT]:    ["BAD_USER_INPUT",      error.details || error.message]
  };

  const mapped = grpcToGql[error.code];
  if (mapped) {
    return new GraphQLError(mapped[1], { extensions: { code: mapped[0] } });
  }

  return new GraphQLError(fallbackMessage, { extensions: { code: "INTERNAL_SERVER_ERROR" } });
}

// ─── Auth guard ───────────────────────────────────────────────────────────────
function requireAuthenticated(ctx) {
  if (!ctx.currentStudentId) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" }
    });
  }
}

// ─── Mapper helpers ───────────────────────────────────────────────────────────
function mapStudent(student) {
  if (!student) return null;
  return { id: student.id, name: student.name, email: student.email, status: student.status };
}

function mapCourse(course) {
  if (!course) return null;
  return {
    id:            course.id,
    title:         course.title,
    description:   course.description,
    status:        course.status,
    enrolledCount: course.enrolled_count,
    capacity:      course.capacity
  };
}

function mapEnrollment(enrollment) {
  if (!enrollment) return null;
  return {
    id:        enrollment.id,
    studentId: String(enrollment.student_id),
    courseId:  String(enrollment.course_id),
    status:    enrollment.status
  };
}

function mapPageInfo(pi) {
  if (!pi) return null;
  return {
    total:           pi.total,
    limit:           pi.limit,
    offset:          pi.offset,
    hasNextPage:     pi.has_next_page,
    hasPreviousPage: pi.has_previous_page
  };
}

// ─── Resolvers ────────────────────────────────────────────────────────────────
export const resolvers = {
  Query: {
    // Trả về student của token hiện tại
    async me(_, _args, ctx) {
      if (!ctx.currentStudentId) return null;
      try {
        const res = await ctx.grpc.student.call("getStudent", { id: ctx.currentStudentId });
        return mapStudent(res.student);
      } catch {
        return null;
      }
    },

    async student(_, { id }, ctx) {
      try {
        const res = await ctx.grpc.student.call("getStudent", { id });
        return mapStudent(res.student);
      } catch (error) {
        if (error.code === grpc.status.NOT_FOUND) return null;
        throw toGraphQLError(error, "Cannot load student");
      }
    },

    async students(_, { limit = 20, offset = 0 }, ctx) {
      try {
        const res = await ctx.grpc.student.call("listStudents", { limit, offset });
        return (res.students || []).map(mapStudent);
      } catch (error) {
        throw toGraphQLError(error, "Cannot load students");
      }
    },

    async studentsPage(_, { limit = 20, offset = 0 }, ctx) {
      try {
        const res = await ctx.grpc.student.call("listStudents", { limit, offset });
        return {
          students: (res.students || []).map(mapStudent),
          pageInfo: mapPageInfo(res.page_info)
        };
      } catch (error) {
        throw toGraphQLError(error, "Cannot load students page");
      }
    },

    async course(_, { id }, ctx) {
      try {
        const res = await ctx.grpc.course.call("getCourse", { id: Number(id) });
        return mapCourse(res.course);
      } catch (error) {
        if (error.code === grpc.status.NOT_FOUND) return null;
        throw toGraphQLError(error, "Cannot load course");
      }
    },

    async courses(_, { limit = 20, offset = 0 }, ctx) {
      try {
        const res = await ctx.grpc.course.call("listCourses", { limit, offset });
        return {
          courses:  (res.courses || []).map(mapCourse),
          pageInfo: mapPageInfo(res.page_info)
        };
      } catch (error) {
        throw toGraphQLError(error, "Cannot load courses");
      }
    },

    async enrollmentsByStudent(_, { studentId }, ctx) {
      try {
        const res = await ctx.grpc.enrollment.call("listEnrollmentsByStudent", {
          student_id: studentId
        });
        return (res.enrollments || []).map(mapEnrollment);
      } catch (error) {
        throw toGraphQLError(error, "Cannot load enrollments");
      }
    },

    async myEnrollments(_, _args, ctx) {
      requireAuthenticated(ctx);
      try {
        const res = await ctx.grpc.enrollment.call("listEnrollmentsByStudent", {
          student_id: ctx.currentStudentId
        });
        return (res.enrollments || []).map(mapEnrollment);
      } catch (error) {
        throw toGraphQLError(error, "Cannot load my enrollments");
      }
    }
  },

  Mutation: {
    async login(_, { email, password }, ctx) {
      try {
        const res = await ctx.grpc.student.call("authenticateStudent", { email, password });

        if (!res.success || !res.student) {
          throw new GraphQLError("Invalid email or password", {
            extensions: { code: "UNAUTHENTICATED" }
          });
        }

        const token = jwt.sign(
          { sub: res.student.id, email: res.student.email },
          JWT_SECRET,
          { expiresIn: "2h" }
        );

        return { token, student: mapStudent(res.student) };
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw toGraphQLError(error, "Cannot login");
      }
    },

    async createStudent(_, { input }, ctx) {
      try {
        const res = await ctx.grpc.student.call("createStudent", input);
        return mapStudent(res.student);
      } catch (error) {
        throw toGraphQLError(error, "Cannot create student");
      }
    },

    // Tạo enrollment cho bất kỳ student (admin use case)
    async createEnrollment(_, { input }, ctx) {
      try {
        const res = await ctx.grpc.enrollment.call(
          "createEnrollment",
          {
            student_id: input.studentId,
            course_id:  Number(input.courseId)
          },
          { timeoutMs: Number(process.env.GRPC_ENROLLMENT_TIMEOUT_MS || 2500) }
        );
        return mapEnrollment(res.enrollment);
      } catch (error) {
        throw toGraphQLError(error, "Cannot create enrollment");
      }
    },

    // Tạo enrollment cho chính mình (dùng JWT)
    async createMyEnrollment(_, { courseId }, ctx) {
      requireAuthenticated(ctx);
      try {
        const res = await ctx.grpc.enrollment.call(
          "createEnrollment",
          {
            student_id: ctx.currentStudentId,
            course_id:  Number(courseId)
          },
          { timeoutMs: Number(process.env.GRPC_ENROLLMENT_TIMEOUT_MS || 2500) }
        );
        return mapEnrollment(res.enrollment);
      } catch (error) {
        throw toGraphQLError(error, "Cannot create my enrollment");
      }
    }
  },

  // ─── Field resolvers cho Enrollment (nested queries) ──────────────────────
  Enrollment: {
    async student(parent, _args, ctx) {
      try {
        const res = await ctx.grpc.student.call("getStudent", { id: String(parent.studentId) });
        return mapStudent(res.student);
      } catch {
        return null;
      }
    },
    async course(parent, _args, ctx) {
      try {
        const res = await ctx.grpc.course.call("getCourse", { id: Number(parent.courseId) });
        return mapCourse(res.course);
      } catch {
        return null;
      }
    }
  }
};