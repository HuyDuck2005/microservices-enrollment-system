export const typeDefs = `#graphql
  type Student {
    id: ID!
    name: String!
    email: String!
    status: String!
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

  type Query {
    student(id: ID!): Student
    course(id: ID!): Course
  }

  input CreateEnrollmentInput {
    studentId: String!
    courseId: String!
  }

  type Mutation {
    createEnrollment(input: CreateEnrollmentInput!): Enrollment
  }
`;