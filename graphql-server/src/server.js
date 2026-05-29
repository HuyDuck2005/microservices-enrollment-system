import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "node:http";
import jwt from "jsonwebtoken";

import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@as-integrations/express5";

import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";
import { grpcClients } from "./grpcClients.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const PORT       = Number(process.env.PORT || 4000);

// ─── Helpers xử lý JWT ───────────────────────────────────────────────────────
function extractToken(req) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length);
}

function getCurrentStudentId(req) {
  const token = extractToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.sub || null;
  } catch {
    return null;
  }
}

// ─── Express + Apollo setup ──────────────────────────────────────────────────
const app        = express();
const httpServer = http.createServer(app);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "graphql-server" });
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
});

await server.start();

app.use(
  "/graphql",
  cors(),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => ({
      // grpc clients với circuit breaker (dùng ctx.grpc.student.call(...))
      grpc:             grpcClients,
      currentStudentId: getCurrentStudentId(req)
    })
  })
);

await new Promise(resolve => httpServer.listen(PORT, resolve));

console.log(`GraphQL Server listening on http://localhost:${PORT}/graphql`);