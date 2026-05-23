import crypto from "node:crypto";
import bcrypt from "bcryptjs";

function normalizePagination(limit, offset) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    return {
        limit: safeLimit,
        offset: safeOffset
    };
}

function buildPageInfo({ total, limit, offset }) {
    return {
        total,
        limit,
        offset,
        has_next_page: offset + limit < total,
        has_previous_page: offset > 0
    };
}

export function createStudentService(studentRepository) {
    return {
        async getStudent(id) {
            const student = await studentRepository.findById(id);

            if (!student) {
                const error = new Error("Student not found");
                error.code = "NOT_FOUND";
                throw error;
            }

            return student;
        },

        async createStudent({ name, email, password }) {
            if (!name || !email || !password) {
                const error = new Error("Name, email and password are required");
                error.code = "INVALID_ARGUMENT";
                throw error;
            }

            const existing = await studentRepository.findByEmailWithPassword(email);

            if (existing) {
                const error = new Error("Email already exists");
                error.code = "ALREADY_EXISTS";
                throw error;
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const student = {
                id: crypto.randomUUID(),
                name,
                email,
                password: passwordHash
            };

            return studentRepository.create(student);
        },

        async authenticateStudent({ email, password }) {
            const student = await studentRepository.findByEmailWithPassword(email);

            if (!student) {
                return {
                    success: false,
                    student: null,
                    message: "Invalid email or password"
                };
            }

            const valid = await bcrypt.compare(password, student.password);

            if (!valid) {
                return {
                    success: false,
                    student: null,
                    message: "Invalid email or password"
                };
            }

            return {
                success: true,
                student: {
                    id: student.id,
                    name: student.name,
                    email: student.email
                },
                message: "Authenticated"
            };
        },

        async listStudents({ limit, offset }) {
            const pagination = normalizePagination(limit, offset);

            const [students, total] = await Promise.all([
                studentRepository.findAll(pagination),
                studentRepository.countAll()
            ]);

            return {
                students,
                page_info: buildPageInfo({
                    total,
                    limit: pagination.limit,
                    offset: pagination.offset
                })
            };
        },

        async batchGetStudents(ids) {
            return studentRepository.findByIds(ids);
        }
    };
}