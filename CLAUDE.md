# Dolka Star — Plan de Proyecto Web

## Sobre el negocio
- **Nombre:** Dolka Star
- **Tipo:** Hamburguesería / bar con pizzería al horno de barro (vibe Smash Club)
- **Especialidad:** hamburguesas. También venden lomitos, sanguches de milanesa y pizzas al horno de barro.
- **Dirección:** Belgrano 363, Andalgalá, Catamarca
- **Horario:** 21:00 a 00:00
- **Teléfono / WhatsApp:** 3835517049
- **Instagram / Facebook:** @dolkastar
- **Dominio:** todavía no asignado (se conecta más adelante, el sitio debe funcionar sin depender de él)

## Identidad visual

### Colores (extraídos del logo y posteos reales de Instagram)
| Token | Hex | Uso |
|---|---|---|
| `--red-primary` | `#E2393C` | Acentos, cenefas a cuadros, botones |
| `--red-logo` | `#FE0000` | Fondo del logo / hero, detalles puntuales |
| `--cream` | `#EEE7D4` | Fondo cálido principal (alternativa al blanco puro) |
| `--ink` | `#0B1014` | Texto principal, footer |
| `--white` | `#FFFFFF` | Texto sobre rojo, fondos secundarios |
| `--gold` | `#D4AF37` | CTA del Club Dolka Star |

### Tipografía
- **Títulos:** fuente display condensada y bold en mayúsculas, tipo *Anton*, *Bebas Neue* u *Oswald 700* (mismo espíritu que el logo).
- **Texto/cuerpo:** fuente neutra legible, tipo *Inter* o *Work Sans*.

### Elementos gráficos
- **Logo:** fondo rojo (#FE0000), tipografía blanca condensada "DOLKA STAR". Archivo en `public/assets/logo.png`.
- **Cenefa a cuadros (checkered pattern)** rojo/crema como separador visual entre secciones — es un elemento de marca recurrente en sus redes.
- **Ilustraciones tipo cómic/mascota** (personaje pizza + personaje burger, estilo retro-punk) como recurso decorativo opcional.
- **Mood general:** informal, divertido, "rock'n'roll de bar" (no fine dining). Las fotos de producto van directo al hueso, sin filtros recargados.

> Foto de referencia de estética real: posteo de Instagram con fondo crema, cenefa a cuadros roja, mascotas ilustradas y foto de pizza al frente.

## Sitemap

1. **`/` Inicio** — hero con foto de la hamburguesa estrella, logo, CTA a "Ver Menú" y "Contacto".
2. **`/nosotros`** — historia del bar (texto pendiente, dejar placeholder editable).
3. **`/menu`** — categorías: Hamburguesas, Lomitos, Sanguches de Milanesa, Pizzas al horno de barro. Navegación por tabs o anchors.
4. **`/club`** — Club Dolka Star: formulario de registro + explicación de la mecánica.
5. **`/contacto`** — dirección, horario, teléfono/WhatsApp (botón directo a wa.me), mapa embebido (Google Maps), íconos de Instagram/Facebook.

## Contenido

### Menú — PLACEHOLDER (reemplazar con la carta real apenas la mande Homero)
Estructura de datos esperada por categoría: nombre del plato, descripción corta, precio.
Usar 3-4 ítems de ejemplo por categoría mientras no llegue la carta real, dejando comentario `// TODO: reemplazar con carta real` en `data/menu.ts`.

### Club Dolka Star
Mecánica: el usuario se registra (nombre + WhatsApp o email) y recibe descuentos/promos una vez por semana — similar a "Club Weiss". Para la v1: formulario simple que guarda el registro (no hace falta sistema de puntos ni login completo todavía).

## Stack técnico recomendado
- **Next.js (App Router) + TypeScript** — estructura clara por carpetas, buen SEO, fácil de desplegar.
- **Tailwind CSS** — para aplicar rápido la paleta y los componentes de marca (cenefa a cuadros como clase reutilizable).
- **Datos del menú en `data/menu.ts`** — así Homero o su hermano pueden editar precios/platos sin tocar el diseño.
- **Formulario del Club** en v1: guardar registros en un archivo/JSON local o tabla simple (se define detalle al implementar).
- **Deploy sugerido:** Vercel (gratis, URL provisoria mientras no haya dominio, fácil de conectar dominio propio después).

## Estructura de carpetas sugerida

```
dolka-star/
├── app/
│   ├── page.tsx              (Inicio)
│   ├── nosotros/page.tsx
│   ├── menu/page.tsx
│   ├── club/page.tsx
│   └── contacto/page.tsx
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   ├── CheckeredDivider.tsx   (cenefa a cuadros reutilizable)
│   ├── MenuCard.tsx
│   └── ClubForm.tsx
├── data/
│   └── menu.ts
├── public/
│   └── assets/
│       ├── logo.png
│       └── (fotos de productos, agregar a medida que lleguen)
└── CLAUDE.md
```

## Pendientes de contenido
- [ ] Carta real (platos + precios) por categoría
- [ ] Fotos de productos en alta calidad
- [ ] Texto de "Nosotros" (historia del bar)
- [ ] Confirmar mecánica final del Club Dolka Star
- [ ] Dominio (cuando esté listo, conectar en Vercel)

## Sistema de Gestión Interna — Plan

### Objetivo
Reemplazar el carrito de pedidos actual (que envía por WhatsApp) por un sistema propio
con tres apps conectadas en tiempo real. Los pedidos del sitio llegan directamente a la
app de cocina y al admin, sin intervención manual.

### Stack
- Backend: Next.js API Routes + Prisma + Neon Postgres (mismo que ya usa el proyecto)
- Tiempo real: Pusher (free tier cubre el volumen de Dolka Star)
- Apps: PWA (instalables desde el navegador, sin App Store)
- Dominio admin: admin.dolkastar.com (a configurar en Vercel cuando esté listo)

### Las 3 apps

**App Cocina** — tablet fija en la cocina
- Comandas entrantes en tiempo real con alerta sonora
- Muestra: platos, variantes, aclaraciones, local, modalidad (mesa/llevar/dirección)
- Estados: Nuevo → En preparación → Listo
- Vista clara, letra grande, sin distracciones

**App Admin/Caja** — computadora del local
- Lista de pedidos del día con estado y filtros (local, modalidad, estado)
- Historial y reportes básicos (ventas del día, platos más pedidos)
- Gestión del menú (precios, disponibilidad de platos)

**App Mozo** — PWA en celular
- Tomar pedidos en mesa
- Ver estado de pedidos activos
- Marcar pedidos como entregados

### Flujo de un pedido
1. Cliente hace pedido en dolkastar.com/menu (carrito existente)
2. Al confirmar, se guarda en DB tabla `Pedido` y se dispara evento Pusher
3. App Cocina y App Admin reciben el pedido en tiempo real
4. Cocina cambia estado → "En preparación" → "Listo"
5. (Futuro) WhatsApp automático al cliente cuando esté listo

### Módulos — orden de desarrollo
1. 🔴 Tabla `Pedido` en DB (Prisma schema + migración)
2. 🔴 API route POST /api/pedidos (guardar + disparar evento Pusher)
3. 🔴 App Cocina — /cocina (comandas en tiempo real, PWA)
4. 🟡 App Admin — /admin (lista de pedidos, filtros, historial)
5. 🟡 App Mozo — /mozo (toma de pedidos en mesa, PWA)
6. 🟢 Gestión de menú desde admin
7. 🟢 Reportes y métricas
8. 🟢 Notificación WhatsApp al cliente cuando el pedido está listo
9. 🟢 Control de stock
10. 🟢 Facturación AFIP

### Variables de entorno necesarias (agregar a .env.local y Vercel)
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=

### Decisiones de diseño
- Dos locales desde el arranque: andalgala y belen
- La cocina de cada local solo ve sus propios pedidos (filtrado por `local`)
- El admin puede ver los dos locales con filtro
- Las rutas /cocina y /admin requieren autenticación simple (password por local)
- Los pedidos del sitio web reemplazan el carrito actual que enviaba por WhatsApp