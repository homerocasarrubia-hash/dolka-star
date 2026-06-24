// Carta real de Dolka Star

export type Precios = {
  simple: number;
  doble?: number;
  triple?: number;
};

export type MenuItem = {
  nombre: string;
  descripcion?: string;
  precio?: number;    // precio único
  precios?: Precios;  // cuando tiene variantes Simple/Doble/Triple
  nota?: string;
  grupo?: string;     // subcategoría interna (usado en Bebidas)
  etiqueta?: string;  // etiqueta destacada arriba del nombre (ej: "EDICIÓN LIMITADA")
};

export type MenuCategoria = {
  id: string;
  label: string;
  nota?: string;      // nota de categoría (ej: "por docena", salsas incluidas)
  items: MenuItem[];
};

export const menu: MenuCategoria[] = [
  {
    id: "hamburguesas",
    label: "Hamburguesas",
    items: [
      { nombre: "Dolkaneta", descripcion: "Carne, muzzarella, bacon, huevo frito, cebolla caramelizada, alioli casero, pan de papa celeste", precios: { simple: 12000, doble: 15000, triple: 18000 }, etiqueta: "EDICIÓN LIMITADA" },
      { nombre: "Mega Dolka", descripcion: "Carne, cheddar, bacon, barbacoa, cebolla, pepinillos", precios: { simple: 11800, doble: 15000, triple: 18000 } },
      { nombre: "Smoke", descripcion: "Carne, cheddar, lechuga, tomate, bacon, huevo, cebolla morada", precios: { simple: 11800, doble: 15000, triple: 18000 } },
      { nombre: "Clásica", descripcion: "Carne, queso, jamón, lechuga, tomate, huevo", precios: { simple: 11800, doble: 15000, triple: 18000 } },
      { nombre: "Dolka Simple", descripcion: "Carne, cheddar, lechuga, tomate", precios: { simple: 11800, doble: 15000, triple: 18000 } },
      { nombre: "DS Tasty", descripcion: "Carne, cheddar, lluvia de bacon, salsa tasty, lechuga, tomate", precios: { simple: 11800, doble: 15000, triple: 18000 } },
      { nombre: "Cheese Burger", descripcion: "Carne, cheddar, bacon", precios: { simple: 11800, doble: 15000, triple: 18000 } },
      { nombre: "Mero Mero", descripcion: "Carne, queso, criollita, paleta, bacon, huevo frito", precios: { simple: 12500, doble: 15000, triple: 18000 } },
      { nombre: "DS Star", descripcion: "Carne, cheddar, bacon, pepinillos", precios: { simple: 11800, doble: 15000, triple: 18000 } },
      { nombre: "Rockstar", descripcion: "Carne, lechuga, tomate, huevo, queso roquefort, bacon", precios: { simple: 11800, doble: 15000, triple: 18000 } },
      { nombre: "Chicken", descripcion: "Pollo frito, cheddar, bacon, pepinillos, lechuga, tomate", precios: { simple: 11800, doble: 15000, triple: 18000 } },
      { nombre: "Veggie", descripcion: "Medallón de verdura, queso tybo o cheddar, lechuga, tomate, huevo", precios: { simple: 11800, doble: 15000, triple: 18000 } },
      { nombre: "Crispy Crispy", descripcion: "Carne, cheddar, bacon, barbacoa, cebolla crispy", precios: { simple: 11800, doble: 15000, triple: 18000 } },
      { nombre: "Chily Hot", descripcion: "Carne, guacamole, nachos picante", precios: { simple: 11800, doble: 15000, triple: 18000 } },
    ],
  },
  {
    id: "pizzas",
    label: "Pizzas al horno de barro",
    items: [
      { nombre: "Margarita", descripcion: "Salsa de tomate, mozzarella, pesto de albahaca, tomates cherry, aceite de oliva, olivas negras, parmesano", precio: 12000 },
      { nombre: "Roquefort", descripcion: "Salsa de tomate, mozzarella, roquefort, aceite de oliva, olivas negras", precio: 12000 },
      { nombre: "Napoleta", descripcion: "Mozzarella, salsa de tomate, tomates frescos, pesto de albahaca, aceite de oliva, olivas negras, parmesano", precio: 12000 },
      { nombre: "Fugazzeta", descripcion: "Mozzarella, salsa de tomate, albahaca, cebolla morada", precio: 12000 },
      { nombre: "Peperoni", descripcion: "Salsa de tomate, mozzarella, pepperoni", precio: 13500 },
      { nombre: "Pecetín", descripcion: "Peceto, salsa de tomate, mozzarella, ajo en aceite de oliva, perejil, tomate cherry", precio: 15500 },
      { nombre: "La Más Mortal", descripcion: "Mozzarella, rollitos de mortadela, pistachos, bolitas de queso crema, pesto de albahaca", precio: 15000 },
      { nombre: "Ibérica", descripcion: "Mozzarella, jamón crudo, rúcula, tomates cherry, aceite de oliva, bolitas de queso crema", precio: 15000 },
      { nombre: "Jamón y Morrones", descripcion: "Mozzarella, olivas negras, tomates cherry, jamón, albahaca", precio: 13000 },
    ],
  },
  {
    id: "lomos",
    label: "Lomos",
    items: [
      { nombre: "Un Clásico", descripcion: "Lomo, jamón, queso, huevo, lechuga, tomate", precios: { simple: 15000, doble: 18500, triple: 22000 } },
      { nombre: "Mexicano", descripcion: "Lomo, queso, criolla, guacamole, lechuga, huevo", precios: { simple: 15000, doble: 18500, triple: 22000 } },
      { nombre: "Onion", descripcion: "Lomo, queso, cebolla caramelizada, lechuga, tomate, huevo", precios: { simple: 15000, doble: 18500, triple: 22000 } },
      { nombre: "Cheddar y Bacon", descripcion: "Lomo, queso, cheddar, bacon, cebolla, barbacoa, lechuga, tomate, huevo", precios: { simple: 15000, doble: 18500, triple: 22000 } },
      { nombre: "Roquestar", descripcion: "Lomo, roquefort, queso, jamón, huevo, lechuga, tomate", precios: { simple: 15000, doble: 18500, triple: 22000 } },
      { nombre: "Ibérico", descripcion: "Lomo, jamón crudo, rúcula, queso, huevo duro, tomate cherry", precios: { simple: 15000, doble: 18500, triple: 22000 } },
      { nombre: "Chicken Lomo", descripcion: "Bife de pollo, jamón, queso, huevo, lechuga, tomate", precios: { simple: 15000, doble: 18500, triple: 22000 } },
    ],
  },
  {
    id: "milanesas",
    label: "Sanguches de Milanesa",
    items: [
      { nombre: "Tucumano", descripcion: "Milanesa, jamón, queso, huevo, lechuga, tomate, mostaza", precios: { simple: 15000, doble: 18500, triple: 22000 } },
      { nombre: "Mila Mexicana", descripcion: "Milanesa, jamón, queso, huevo, criolla, guacamole, picante, lechuga", precios: { simple: 15000, doble: 18500, triple: 22000 } },
      { nombre: "American Mila", descripcion: "Milanesa, cheddar, bacon, cebolla, lechuga, tomate, huevo", precios: { simple: 15000, doble: 18500, triple: 22000 } },
      { nombre: "Roquefort", descripcion: "Milanesa, queso roquefort, jamón, huevo, lechuga, tomate", precios: { simple: 15000, doble: 18500, triple: 22000 } },
    ],
  },
  {
    id: "milanesas-al-plato",
    label: "Milanesa al Plato",
    nota: "Todas a $14.000",
    items: [
      { nombre: "Mila Napolitana", precio: 14000 },
      { nombre: "Mila Cheddar y Bacon", precio: 14000 },
      { nombre: "Mila Mexicana", precio: 14000 },
      { nombre: "Mila Roquefort", precio: 14000 },
      { nombre: "Mila a Caballo", precio: 14000 },
      { nombre: "Mila Doble Muzzarella", precio: 14000 },
    ],
  },
  {
    id: "empanadas",
    label: "Empanadas",
    nota: "Precio por docena",
    items: [
      { nombre: "Jamón y Queso", precio: 10000 },
      { nombre: "Queso y Cebolla", precio: 10000 },
      { nombre: "Capresse", precio: 10000 },
      { nombre: "Choclo", precio: 10000 },
      { nombre: "Pollo", precio: 10000 },
      { nombre: "Carne Mechada al Malbec", precio: 15000 },
    ],
  },
  {
    id: "papas-nuggets",
    label: "Papas y Nuggets",
    items: [
      { nombre: "Papas Comunes", precio: 4500 },
      { nombre: "Papas Cheddar y Bacon", precio: 9000 },
      { nombre: "Papas Peruanas", descripcion: "Con jamón, queso, huevo, cebolla de verdeo", precio: 9000 },
      { nombre: "Pollo Frito", precio: 11500 },
      { nombre: "Flamin Chicken", descripcion: "Pollo rebozado en Flamin's Hot o Doritos picantes", precio: 13500 },
    ],
  },
  {
    id: "picadas",
    label: "Picadas",
    nota: "Para compartir — caliente y fría",
    items: [
      {
        nombre: "Picada Dolka",
        descripcion: "Variedad de fiambres, 4 quesos, aceitunas, pollo frito, milanesas, lactonesa, barbacoa, tomates cherry",
        precio: 17500,
      },
    ],
  },
  {
    id: "pastas",
    label: "Pastas",
    nota: "Salsas a elección sin cargo extra: Fileto · Vegetales Asados · Hongos y Verdeo · Carne Mechada al Malbec",
    items: [
      { nombre: "Sorrentinos — Ricota y Nuez", precio: 12000 },
      { nombre: "Sorrentinos — Jamón y Queso", precio: 12000 },
      { nombre: "Sorrentinos — Acelga y Ricota", precio: 12000 },
      { nombre: "Ravioles — Jamón y Queso", precio: 12000 },
      { nombre: "Ravioles — Acelga y Ricota", precio: 12000 },
      { nombre: "Spaghettis", precio: 12000 },
    ],
  },
  {
    id: "saludables",
    label: "Saludables",
    items: [
      { nombre: "Bife de Pollo a la Plancha", precio: 13500 },
      { nombre: "Bife de Carne a la Plancha", precio: 13500 },
    ],
  },
  {
    id: "bebidas",
    label: "Bebidas",
    items: [
      { nombre: "Coca-Cola / Fanta / Sprite 350ml", precio: 3500, grupo: "Gaseosas" },
      { nombre: "Coca-Cola / Fanta / Sprite 1Lt", precio: 6000, grupo: "Gaseosas" },
      { nombre: "Coca-Cola / Fanta / Sprite 1.5Lt", precio: 6500, grupo: "Gaseosas" },
      { nombre: "Pepsi / Fanta / Sprite / Coca-Cola (lata)", precio: 3500, grupo: "Gaseosas" },
      { nombre: "Agua Mineral 1/2L", precio: 2000, grupo: "Aguas" },
      { nombre: "Agua Mineral 1L", precio: 3500, grupo: "Aguas" },
      { nombre: "Aquarius 1/2L", precio: 3500, grupo: "Aguas" },
      { nombre: "Aquarius 1L", precio: 5000, grupo: "Aguas" },
      { nombre: "Quilmes / Brahma / Salta", precio: 6500, grupo: "Cervezas" },
      { nombre: "Heineken / Corona / Patagonia / Stella", precio: 8000, grupo: "Cervezas Premium" },
      { nombre: "Brahma / Budweiser (lata)", precio: 4000, grupo: "Cervezas — Lata" },
    ],
  },
];
