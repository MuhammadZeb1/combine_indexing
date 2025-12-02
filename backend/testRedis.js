const { createClient } = require("redis");

const client = createClient({
  url: "rediss://default:ATJWAAIncDIwODNmOTkzNTJmODE0NzQxOTc4ZWYyZWY4NTE5NGY1ZnAyMTI4ODY@becoming-giraffe-12886.upstash.io:6379"
});

client.on("error", (err) => console.error("Redis Client Error", err));

async function test() {
  await client.connect();
  const pong = await client.ping();
  console.log("Redis Ping Response:", pong);
  await client.disconnect();
}

test();
