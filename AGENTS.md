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
└── AGENTS.md
```

## Pendientes de contenido
- [ ] Carta real (platos + precios) por categoría
- [ ] Fotos de productos en alta calidad
- [ ] Texto de "Nosotros" (historia del bar)
- [ ] Confirmar mecánica final del Club Dolka Star
- [ ] Dominio (cuando esté listo, conectar en Vercel)
