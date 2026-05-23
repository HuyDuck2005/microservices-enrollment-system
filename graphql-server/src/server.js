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
const PORT = Number(process.env.PORT || 4000);

const app = express();
const httpServer = http.createServer(app);

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "graphql-server"
    });
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
        context: async ({ req }) => {
            let currentStudentId = null;
            
            const authHeader = req.headers.authorization || "";
            if (authHeader.startsWith("Bearer ")) {
                const token = authHeader.substring(7, authHeader.length);
                try {
                    const decoded = jwt.verify(token, JWT_SECRET);
                    currentStudentId = decoded.sub;
                } catch (error) {
                    console.log("Invalid token");
                }
            }

            return {
                grpc: grpcClients,
                currentStudentId
            };
        }
    })
);

await new Promise(resolve => {
    httpServer.listen(PORT, resolve);
});

console.log(`GraphQL Server Listening on http://localhost:${PORT}/graphql`);
