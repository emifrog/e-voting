import { performance } from 'perf_hooks';

const requestMetrics = new Map();

export const metricsMiddleware = (req, res, next) => {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    const key = `${req.method} ${req.path}`;
    
    if (!requestMetrics.has(key)) {
      requestMetrics.set(key, { count: 0, totalTime: 0, maxTime: 0 });
    }
    
    const metric = requestMetrics.get(key);
    metric.count++;
    metric.totalTime += duration;
    metric.maxTime = Math.max(metric.maxTime, duration);
    
    // Log si > 1000ms
    if (duration > 1000) {
      console.warn(`Slow request: ${key} took ${duration.toFixed(2)}ms`);
    }
  });
  
  next();
};

// GET /api/metrics pour visualiser
app.get('/api/metrics', (req, res) => {
  const metrics = {};
  for (const [key, value] of requestMetrics.entries()) {
    metrics[key] = {
      count: value.count,
      avgTime: (value.totalTime / value.count).toFixed(2),
      maxTime: value.maxTime.toFixed(2)
    };
  }
  res.json(metrics);
});
