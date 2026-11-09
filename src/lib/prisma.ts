import { PrismaClient } from '@prisma/client';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres.wtvgbufsktjiliovnpvz:Thara%40110601@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const DEFAULT_DIRECT_URL =
  'postgresql://postgres.wtvgbufsktjiliovnpvz:Thara%40110601@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
}

if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = DEFAULT_DIRECT_URL;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
