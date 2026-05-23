import express from "express";

export function startHealthServer({ serviceName, port, db }) {
  const app = express();

  app.get("/health", async (req, res) => {
    try {
      await db.raw("select 1");

      res.json({
        status: "ok",
        service: serviceName
      });
    } catch (error) {
      res.status(503).json({
        status: "error",
        service: serviceName
      });
    }
  });

  return app.listen(port, () => {
    console.log(`${serviceName} health endpoint listening on ${port}`);
  });
}