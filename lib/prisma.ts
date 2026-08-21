// Cliente de Prisma contra Neon.
//
// Prisma 7 no lee la URL del schema: la conexión de runtime entra por adapter.
// El de Neon habla por HTTP/WebSocket en vez de TCP, que es lo que hace falta
// en funciones serverless, donde no hay pool de conexiones que sobreviva entre
// invocaciones.

import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from './generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Falta DATABASE_URL: sin eso no hay dónde guardar los puntajes.');
}

function crearCliente(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

// En desarrollo, el hot reload vuelve a evaluar este módulo en cada cambio y
// cada instancia nueva abre sus propias conexiones. Guardarlo en globalThis es
// la forma estándar de que sobreviva a los reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
