import Redis from 'ioredis';

const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : null;

export async function getCached(key, fallback, ttl = 300) {
  if (!redis) return fallback();
  
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fallback();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

// Utilisation dans routes
app.get('/api/elections/:id', async (req, res) => {
  const election = await getCached(
    `election:${req.params.id}`,
    () => db.getElection(req.params.id),
    300 // 5 min cache
  );
  res.json(election);
});
