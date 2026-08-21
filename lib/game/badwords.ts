// Filtro de nombres para la tabla de puntajes. El ranking se muestra público en
// el sitio de un negocio, así que conviene que no aparezca cualquier cosa.

/**
 * Términos vetados. Se comparan sobre el nombre normalizado (minúsculas y sin
 * acentos), así que van todos en minúscula y sin tildes.
 *
 * Para agregar más, sumalos acá y listo: el filtro no necesita tocarse.
 */
const PROHIBIDAS = [
  'puto',
  'puta',
  'putos',
  'putas',
  'concha',
  'conchuda',
  'verga',
  'pija',
  'pito',
  'culo',
  'orto',
  'boludo',
  'boluda',
  'pelotudo',
  'pelotuda',
  'forro',
  'forra',
  'mierda',
  'carajo',
  'joder',
  'coger',
  'trolo',
  'trola',
  'putazo',
  'chota',
  'garcha',
  'nazi',
  'hitler',
  'admin',
  'moderador',
  'dolkastar',
];

/**
 * Palabras cortas que se bloquean solo como palabra entera. Como subcadena
 * pisarían nombres legítimos: "ano" está dentro de "Mariano" y "Ana", "sexo"
 * no, pero el criterio se mantiene por prolijidad.
 */
const PROHIBIDAS_EXACTAS = ['ano', 'ojt', 'ssss'];

/** Minúsculas y sin acentos, para que "PUTÓ" y "puto" caigan en la misma bolsa. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** true si el nombre contiene algo que no queremos publicar. */
export function tienePalabraProhibida(nombre: string): boolean {
  const limpio = normalizar(nombre);

  if (PROHIBIDAS.some((palabra) => limpio.includes(palabra))) return true;

  const palabras = limpio.split(/\s+/).filter(Boolean);
  return palabras.some((palabra) => PROHIBIDAS_EXACTAS.includes(palabra));
}
