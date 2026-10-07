import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'

// globalThis is not strictly needed for Cloudflare Edge, but good for local Node dev
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaClient: PrismaClient;

if (process.env.DB) {
  // We are in Cloudflare Workers environment (via OpenNext)
  const adapter = new PrismaD1(process.env.DB as any);
  prismaClient = new PrismaClient({ adapter });
} else {
  // Local development fallback
  prismaClient = globalForPrisma.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient;
