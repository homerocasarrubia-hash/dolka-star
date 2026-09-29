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

// ─────────────────────────────────────────
// Reintento por conexión caída
// ─────────────────────────────────────────
//
// El driver de Neon habla por WebSocket y ese socket se cae solo: después de un
// rato sin pedidos —entre una tanda y otra, algo normal en un bar— la primera
// consulta que llega se encuentra con la conexión muerta y falla. La segunda
// anda, porque el driver ya reconectó.
//
// Se vio en vivo: un PATCH devolvió 500 con un ErrorEvent crudo del socket y el
// mismo PATCH, repetido, devolvió 200. En una pantalla de cocina eso es una
// comanda que no cambia de estado sin motivo aparente.

/** Códigos de Prisma que hablan de la conexión, no de los datos. */
const CODIGOS_DE_CONEXION = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

function esErrorDeConexion(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; type?: unknown; message?: unknown };

  if (typeof e.code === 'string' && CODIGOS_DE_CONEXION.has(e.code)) return true;

  // Cuando el WebSocket se corta, lo que sube no es un error de Prisma sino el
  // ErrorEvent pelado del socket: `{ type: 'error' }` y poco más.
  if (e.type === 'error' && typeof e.message !== 'string') return true;

  const texto = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  return /socket|connection|closed|terminated|econnreset|timed out/.test(texto);
}

/**
 * Corre una consulta y, si falló por la conexión y no por los datos, la repite
 * una sola vez. Cualquier otro error sube tal cual, y si el reintento también
 * falla, también.
 *
 * Sólo para consultas que repetidas dan lo mismo: leer, o un `update` que deja
 * el mismo valor. Un `create` NO va acá: si la primera llegó a guardarse y lo
 * que se perdió fue la respuesta, el reintento dejaría el pedido duplicado.
 */
export async function conReintento<T>(consulta: () => Promise<T>): Promise<T> {
  try {
    return await consulta();
  } catch (error) {
    if (!esErrorDeConexion(error)) throw error;
    console.warn('[prisma] la conexión estaba caída, se reintenta una vez');
    return consulta();
  }
}
