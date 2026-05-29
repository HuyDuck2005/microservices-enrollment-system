import grpc from "@grpc/grpc-js";

function toGrpcError(error) {
    // Log lỗi thực tế ra terminal để bạn biết chuyện gì đang xảy ra
    console.error("gRPC Handler Error:", error); 

    if (error.code === "NOT_FOUND") {
        return { code: grpc.status.NOT_FOUND, details: error.message };
    }
    if (error.code === "INVALID_ARGUMENT") {
        return { code: grpc.status.INVALID_ARGUMENT, details: error.message };
    }
    if (error.code === "ALREADY_EXISTS") {
        return { code: grpc.status.ALREADY_EXISTS, details: error.message };
    }
    
    return {
        code: grpc.status.INTERNAL,
        details: error.message || "Internal server error"
    };
}

export function createStudentGrpcHandlers(studentService) {
    return {
        async getStudent(call, callback) {
            try {
                const student = await studentService.getStudent(call.request.id);
                callback(null, { student });
            } catch (error) {
                callback(toGrpcError(error));
            }
        },
        
        async createStudent(call, callback) {
            try {
                const student = await studentService.createStudent(call.request);
                callback(null, { student });
            } catch (error) {
                callback(toGrpcError(error));
            }
        },

        async authenticateStudent(call, callback) {
            try {
                const result = await studentService.authenticateStudent(call.request);
                callback(null, result);
            } catch (error) {
                callback(toGrpcError(error));
            }
        },

        async listStudents(call, callback) {
            try {
                // Đảm bảo call.request có limit/offset đúng với proto
                const result = await studentService.listStudents(call.request);
                callback(null, result);
            } catch (error) {
                callback(toGrpcError(error));
            }
        },

        async batchGetStudents(call, callback) {
            try {
                const students = await studentService.batchGetStudents(call.request.ids);
                callback(null, { students });
            } catch (error) {
                callback(toGrpcError(error));
            }
        }
    };
}