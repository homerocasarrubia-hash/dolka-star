// Config de Prisma CLI (migrate, generate). La conexión de runtime NO sale de
// acá: la arma lib/prisma.ts con el adapter de Neon.
//
// Este proyecto guarda las variables en .env.local, que dotenv no carga por
// defecto, así que se pide explícitamente.
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnv({ path: '.env.local' });
loadEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
