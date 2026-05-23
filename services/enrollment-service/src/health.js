import express from 'express';

export function startHealthServer({ serviceName, port, db }) {
  const app = express();

  app.get('/health', async (req, res) => {
    try {
      await db.raw('SELECT 1');
      res.status(200).json({
        service: serviceName,
        status: 'UP',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        service: serviceName,
        status: 'DOWN',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.listen(port, () => {
    console.log(`${serviceName} health endpoint listening on port ${port}`);
  });
}