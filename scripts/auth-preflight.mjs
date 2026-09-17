import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
  const roles = await prisma.$queryRaw`SELECT "role"::text AS role, "isActive", count(*)::int AS count FROM "users" GROUP BY "role", "isActive"`;
  const collisions = await prisma.$queryRaw`SELECT count(*)::int AS count FROM (SELECT lower(btrim("email")) FROM "users" GROUP BY lower(btrim("email")) HAVING count(*) > 1) AS duplicates`;
  console.log(JSON.stringify({ roles, normalizedEmailCollisionGroups: collisions[0].count }, null, 2));
  if (collisions[0].count || !roles.some((r) => r.role === "admin" && r.isActive && r.count > 0)) process.exitCode = 1;
} finally { await prisma.$disconnect(); }
