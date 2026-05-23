import "dotenv/config";
import { GraphQLError } from "graphql";
import jwt from "jsonwebtoken";
import { grpc } from "./grpcClients.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

function toGraphQLError(error, fallbackMessage = "Internal server error") {
    if (error.code === grpc.status.NOT_FOUND) {
        return new GraphQLError(error.details || "Resource not found", {
            extensions: {
                code: "NOT_FOUND"
            }
        });
    }
    if (error.code === grpc.status.INVALID_ARGUMENT) {
        return new GraphQLError(error.details || "Invalid argument", {
            extensions: {
                code: "BAD_USER_INPUT"
            }
        });
    }
    if (error.code === grpc.status.ALREADY_EXISTS) {
        return new GraphQLError(error.details || "Resource already exists", {
            extensions: {
                code: "ALREADY_EXISTS"
            }
        });
    }
    if (error.code === grpc.status.UNAVAILABLE) {
        return new GraphQLError("A backend service is unavailable", {
            extensions: {
                code: "SERVICE_UNAVAILABLE"
            }
        });
    }
    if (error.code === grpc.status.DEADLINE_EXCEEDED) {
        return new GraphQLError("A backend service timed out", {
            extensions: {
                code: "SERVICE_TIMEOUT"
            }
        });
    }

    return new GraphQLError(fallbackMessage, {
        extensions: {
            code: "INTERNAL_SERVER_ERROR"
        }
    });
}

function mapPageInfo(pageInfo) {
    return {
        total: pageInfo.total,
        limit: pageInfo.limit,
        offset: pageInfo.offset,
        hasNextPage: pageInfo.has_next_page,
        hasPreviousPage: pageInfo.has_previous_page
    };
}

export const resolvers = {
    Query: {
        async student(_, { id }, ctx) {
            try {
                const response = await ctx.grpc.student.call("getStudent", {
                    id
                });
                return response.student;
            } catch (error) {
                if (error.code === grpc.status.NOT_FOUND) {
                    return null;
                }
                throw toGraphQLError(error, "Cannot load student");
            }
        },

        async me(_, args, ctx) {
            if (!ctx.currentStudentId) {
                return null;
            }

            try {
                const response = await ctx.grpc.student.call("getStudent", {
                    id: ctx.currentStudentId
                });

                return response.student;
            } catch (error) {
                return null;
            }
        },

        async students(_, { limit = 20, offset = 0 }, ctx) {
            try {
                const response = await ctx.grpc.student.call("ListStudents", {
                    limit,
                    offset
                });

                return response.students;
            } catch (error) {
                throw toGraphQLError(error, "Cannot load students");
            }
        },

        async studentsPage(_, { limit = 20, offset = 0 }, ctx) {
            try {
                const response = await ctx.grpc.student.call("ListStudents", {
                    limit,
                    offset
                });

                return {
                    items: response.students,
                    pageInfo: mapPageInfo(response.page_info)
                };
            } catch (error) {
                throw toGraphQLError(error, "Cannot load students page");
            }
        }
    },
    Mutation: {
        async login(_, { email, password }, ctx) {
            try {
                const response = await ctx.grpc.student.call("authenticateStudent", {
                    email,
                    password
                });

                if (!response.success || !response.student) {
                    throw new GraphQLError("Invalid email or password", {
                        extensions: {
                            code: "UNAUTHENTICATED"
                        }
                    });
                }

                const token = jwt.sign(
                    {
                        sub: response.student.id,
                        email: response.student.email
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "2h"
                    }
                );

                return {
                    token,
                    student: response.student
                };
            } catch (error) {
                console.log('resolvers-login-error:', error);
                if (error instanceof GraphQLError) {
                    throw error;
                }
                throw toGraphQLError(error, "Cannot login");
            }
        },

        async createStudent(_, { input }, ctx) {
            try {
                const response = await ctx.grpc.student.call("createStudent", input);
                return response.student;
            } catch (error) {
                throw toGraphQLError(error, "Cannot create student");
            }
        }
    }
};
