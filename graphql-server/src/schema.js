export const typeDefs = `#graphql

  # ─── Core types ──────────────────────────────────────────────────────────────

  type Student {
    id:     ID!
    name:   String!
    email:  String!
    status: String
  }

  type Course {
    id:           ID!
    title:        String!
    description:  String
    status:       String!
    enrolledCount: Int!
    capacity:     Int!
  }

  type Enrollment {
    id:        ID!
    studentId: ID!
    courseId:  ID!
    status:    String!
    # Nested resolvers — lấy từ student-service / course-service
    student:   Student
    course:    Course
  }

  # ─── Pagination ───────────────────────────────────────────────────────────────

  type PageInfo {
    total:          Int!
    limit:          Int!
    offset:         Int!
    hasNextPage:    Boolean!
    hasPreviousPage: Boolean!
  }

  # Dùng field "students" / "courses" để khớp với resolver trả về
  type StudentPage {
    students: [Student!]!
    pageInfo: PageInfo!
  }

  type CoursePage {
    courses:  [Course!]!
    pageInfo: PageInfo!
  }

  # ─── Auth ────────────────────────────────────────────────────────────────────

  type AuthPayload {
    token:   String!
    student: Student!
  }

  # ─── Inputs ──────────────────────────────────────────────────────────────────

  input CreateStudentInput {
    name:     String!
    email:    String!
    password: String!
  }

  input CreateEnrollmentInput {
    studentId: String!
    courseId:  Int!
  }

  # ─── Query ───────────────────────────────────────────────────────────────────

  type Query {
    # Student
    me:                             Student
    student(id: ID!):               Student
    students(limit: Int, offset: Int): [Student!]!
    studentsPage(limit: Int, offset: Int): StudentPage

    # Course
    course(id: ID!):                Course
    courses(limit: Int, offset: Int): CoursePage

    # Enrollment
    enrollmentsByStudent(studentId: ID!): [Enrollment!]!
    myEnrollments:                        [Enrollment!]!
  }

  # ─── Mutation ────────────────────────────────────────────────────────────────

  type Mutation {
    # Auth
    login(email: String!, password: String!): AuthPayload!

    # Student
    createStudent(input: CreateStudentInput!): Student!

    # Enrollment
    createEnrollment(input: CreateEnrollmentInput!): Enrollment!
    createMyEnrollment(courseId: Int!):              Enrollment!
  }
`;