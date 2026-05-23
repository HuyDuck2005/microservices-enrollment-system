export const typeDefs = `#graphql
  type Student {
    id: ID!
    name: String!
    email: String!
  }

  type Course {
    id: ID!
    title: String!
    description: String
    status: String!
    enrolledCount: Int!
    capacity: Int!
  }

  type Enrollment {
    id: ID!
    studentId: String!
    courseId: String!
    status: String!
    student: Student
    course: Course
  }

  type AuthPayload {
    token: String!
    student: Student!
  }

  type PageInfo {
    total: Int!
    limit: Int!
    offset: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type StudentPage {
    students: [Student!]!
    pageInfo: PageInfo!
  }

  type CoursePage {
    courses: [Course!]!
    pageInfo: PageInfo!
  }

  type Query {
    me: Student
    student(id: ID!): Student
    students(limit: Int, offset: Int): [Student!]!
    studentsPage(limit: Int, offset: Int): StudentPage
    course(id: ID!): Course
    courses(limit: Int, offset: Int): CoursePage
    enrollmentsByStudent(studentId: ID!): [Enrollment!]!
    myEnrollments: [Enrollment!]!
  }

  input CreateStudentInput {
    name: String!
    email: String!
    password: String!
  }

  input CreateEnrollmentInput {
    studentId: String!
    courseId: Int!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    createStudent(input: CreateStudentInput!): Student!
    createEnrollment(input: CreateEnrollmentInput!): Enrollment!
    createMyEnrollment(courseId: Int!): Enrollment!
  }
`;