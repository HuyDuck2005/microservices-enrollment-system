export const typeDefs = `#graphql
type Student {
  id: ID!
  name: String!
  email: String!
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
  items: [Student!]!
  pageInfo: PageInfo!
}

type Query {
  student(id: ID!): Student
  me: Student
  students(limit: Int, offset: Int): [Student!]!
  studentsPage(limit: Int, offset: Int): StudentPage!
}

type Mutation {
  login(email: String!, password: String!): AuthPayload!
  createStudent(input: CreateStudentInput!): Student!
}

input CreateStudentInput {
  name: String!
  email: String!
  password: String!
}
`;
