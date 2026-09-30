/**
 * Guías de práctica (/guias) — contenido público para que Google encuentre
 * Fermança en búsquedas de gente que todavía no la conoce ("rutina de
 * estudio de guitarra", "cómo ser constante practicando"…). Solo en
 * español, por eso el texto vive aquí y no en messages/*.json.
 *
 * Todo lo que se dice de la app tiene que ser cierto hoy (bloques que se
 * encadenan con aviso, plantillas, metrónomo en la sesión, rachas, objetivo
 * semanal, recordatorios, amigos y grupos). Si una función cambia, revisar
 * la sección "Cómo hacerlo con Fermança" de cada guía.
 */

/**
 * La imagen para compartir de toda la web (src/app/opengraph-image.tsx).
 * Hay que repetirla en las páginas de guías: al definir su propio
 * `openGraph`, Next deja de heredar la del layout raíz. Mismo tamaño que
 * SOCIAL_IMAGE_SIZE (no se importa: ese módulo arrastra node:fs y next/og).
 */
export const GUIDES_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Fermança",
};

export type GuideBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

export interface Guide {
  slug: string;
  /** El <h1> y el título de la pestaña/Google. */
  title: string;
  /** Meta description: lo que Google enseña bajo el título (~150 caracteres). */
  description: string;
  /** Fechas de calendario (AAAA-MM-DD), para el JSON-LD y el sitemap. */
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  body: GuideBlock[];
}

const PRACTICE_ROUTINE: Guide = {
  slug: "rutina-de-practica-de-30-minutos",
  title: "Cómo organizar una rutina de práctica musical de 30 minutos",
  description:
    "Una estructura sencilla para aprovechar 30 minutos de práctica con cualquier instrumento: calentamiento, técnica, repertorio y un final libre, con variantes de 20 a 60 minutos.",
  publishedAt: "2026-09-30",
  updatedAt: "2026-09-30",
  readingMinutes: 5,
  body: [
    {
      type: "p",
      text: "Treinta minutos al día dan para mucho más de lo que parece, siempre que sepas en qué vas a gastar cada uno. El problema casi nunca es el tiempo: es sentarse con el instrumento sin plan, tocar lo que ya sale bien y levantarse con la sensación de no haber avanzado. Esta es una estructura sencilla que funciona con cualquier instrumento y que puedes ajustar a tu nivel.",
    },
    { type: "h2", text: "Por qué dividir la práctica en bloques" },
    {
      type: "p",
      text: "Cuando la sesión tiene partes claras, cada una con su tiempo, pasan tres cosas: no te quedas atascado en lo mismo toda la tarde, trabajas también lo que menos te apetece y terminas sabiendo exactamente qué has hecho. Además, cambiar de actividad cada pocos minutos ayuda a mantener la concentración, que suele decaer cuando repites lo mismo durante mucho rato.",
    },
    { type: "h2", text: "La rutina: 30 minutos en cuatro bloques" },
    {
      type: "ol",
      items: [
        "Calentamiento (5 minutos). Ejercicios lentos y cómodos para despertar las manos, la respiración o la voz: escalas sencillas, notas largas, arpegios o vocalizaciones. No se trata de lucirse, sino de entrar en materia sin tensión.",
        "Técnica (10 minutos). Aquí va lo que más te cuesta: ese pasaje rápido, un cambio de posición, un tipo de articulación. Elige una sola cosa por sesión y trabájala despacio, con metrónomo si puedes, subiendo el tempo solo cuando salga limpia.",
        "Repertorio (12 minutos). La obra, canción o estudio que estás preparando. Mejor por fragmentos que de principio a fin: localiza los compases que fallan, repítelos aislados y luego vuelve a encajarlos con lo que viene antes y después.",
        "Tocar por gusto (3 minutos). Termina con algo que ya domines o improvisando. Parece un detalle, pero acabar con una buena sensación hace que al día siguiente te apetezca volver.",
      ],
    },
    { type: "h2", text: "Cómo adaptarla a otros tiempos" },
    {
      type: "ul",
      items: [
        "20 minutos: 3 de calentamiento, 7 de técnica y 10 de repertorio. Si un día solo tienes esto, mejor así que saltarte la sesión.",
        "45 minutos: 5 de calentamiento, 15 de técnica, 20 de repertorio y 5 libres.",
        "60 minutos: 10 de calentamiento, 15 de técnica, 25 de repertorio, 5 de lectura a primera vista o de sacar algo de oído y 5 libres. A partir de una hora conviene hacer una pausa corta a mitad.",
      ],
    },
    { type: "h2", text: "Errores habituales" },
    {
      type: "ul",
      items: [
        "Tocar siempre la obra entera desde el principio: los primeros compases acaban perfectos y el final, abandonado.",
        "Saltarse el calentamiento «porque hay poco tiempo», que es justo cuando más se nota la tensión.",
        "Querer mejorar cinco cosas a la vez. Una por sesión, bien trabajada, cunde más.",
        "No apuntar nada. Una nota de dos líneas al acabar («el compás 24 ya sale a 80») te ahorra empezar de cero mañana.",
      ],
    },
    { type: "h2", text: "Cómo hacerlo con Fermança" },
    {
      type: "p",
      text: "En Fermança creas la sesión con estos mismos bloques y el tiempo de cada uno, y el cronómetro pasa de uno a otro solo, con un aviso en cada cambio, así no tienes que estar mirando el reloj. Si la guardas como plantilla, mañana la empiezas con un toque. Al terminar puedes dejar una nota y, con el tiempo, las estadísticas te dirán cuánto has dedicado a técnica y cuánto a repertorio.",
    },
  ],
};

const CONSISTENCY: Guide = {
  slug: "como-ser-constante-practicando-un-instrumento",
  title: "Cómo ser constante practicando un instrumento",
  description:
    "Ideas prácticas para practicar con regularidad: sesiones cortas, un momento fijo del día, objetivos semanales realistas y formas de no depender de la motivación.",
  publishedAt: "2026-09-30",
  updatedAt: "2026-09-30",
  readingMinutes: 5,
  body: [
    {
      type: "p",
      text: "Casi todo el que aprende un instrumento pasa por lo mismo: una semana practicando cada día y otra sin sacarlo de la funda. La regularidad pesa más que las horas sueltas: veinte minutos casi todos los días suelen dar más resultado que tres horas un domingo. La buena noticia es que la constancia no depende tanto de la fuerza de voluntad como de lo fácil que te lo pongas.",
    },
    { type: "h2", text: "1. Empieza más pequeño de lo que crees" },
    {
      type: "p",
      text: "Si te propones una hora diaria y un día solo tienes quince minutos, es fácil pensar que no merece la pena. Mejor un mínimo tan pequeño que no haya excusa, de diez o quince minutos, y que cualquier día que hagas más sea un extra. Lo importante al principio es no romper la costumbre.",
    },
    { type: "h2", text: "2. Practica siempre a la misma hora" },
    {
      type: "p",
      text: "Ata la práctica a algo que ya haces cada día: después de comer, al volver de clase o antes de cenar. Cuando la sesión tiene su momento, deja de ser una decisión que tomar cada día. Si puedes, deja el instrumento a la vista y listo para tocar: sacarlo, montarlo y afinarlo también es una barrera.",
    },
    { type: "h2", text: "3. Decide qué vas a hacer antes de empezar" },
    {
      type: "p",
      text: "Sentarse sin plan lleva a tocar lo de siempre. Tener la sesión preparada (qué ejercicios, qué obra, cuánto tiempo para cada cosa) elimina la parte de pensar y te deja directamente en la de tocar. Una rutina de bloques fija, que vas ajustando cada semana, funciona muy bien para esto.",
    },
    { type: "h2", text: "4. Ponte un objetivo semanal, no diario" },
    {
      type: "p",
      text: "Un objetivo diario se rompe con cualquier imprevisto. Uno semanal, como «cinco días» o «tres horas esta semana», deja margen para los días malos sin sensación de fracaso. Revísalo al final de cada semana: si lo cumples con holgura, súbelo un poco; si no llegas, bájalo sin culpa.",
    },
    { type: "h2", text: "5. Haz visible el progreso" },
    {
      type: "p",
      text: "Ver una racha de días seguidos, o cuántas horas llevas este mes, motiva más que cualquier propósito. No hace falta nada sofisticado: un calendario de papel en el que marcas cada día sirve. Lo que importa es poder ver de un vistazo que llevas tiempo avanzando, sobre todo en las semanas en que no notas la mejora al tocar.",
    },
    { type: "h2", text: "6. No practiques solo" },
    {
      type: "p",
      text: "Quedar para practicar a la vez con alguien, aunque sea a distancia, o compartir tu progreso con un grupo añade un pequeño compromiso que ayuda mucho los días de pereza. Si estudias con un profesor o tocas en una banda, proponer un objetivo común para la semana convierte la práctica en algo compartido.",
    },
    { type: "h2", text: "7. Si fallas un día, no falles dos" },
    {
      type: "p",
      text: "Todo el mundo se salta días. El problema no es fallar uno, sino que un día suelto se convierta en una semana. Si ayer no practicaste, hoy haz aunque sea la sesión mínima.",
    },
    { type: "h2", text: "Cómo te ayuda Fermança" },
    {
      type: "ul",
      items: [
        "Recordatorios a la hora que elijas, para que la práctica tenga su momento.",
        "Rachas y un objetivo semanal de días u horas, para ver tu constancia de un vistazo.",
        "Plantillas de sesión, para empezar sin tener que pensar qué toca hoy.",
        "Amigos y grupos con los que practicar a la vez o compartir el progreso.",
      ],
    },
  ],
};

const GUITAR_BEGINNERS: Guide = {
  slug: "rutina-de-guitarra-para-principiantes",
  title: "Rutina de práctica de guitarra para principiantes",
  description:
    "Una rutina de 30 minutos para quien empieza con la guitarra: calentamiento, cambios de acordes, ritmo con metrónomo y una canción, con consejos para cada parte.",
  publishedAt: "2026-09-30",
  updatedAt: "2026-09-30",
  readingMinutes: 6,
  body: [
    {
      type: "p",
      text: "Los primeros meses con la guitarra son los más difíciles: duelen las yemas, los acordes suenan apagados y los cambios parecen imposibles a tempo. Una rutina corta y bien repartida ayuda a superar esa fase sin frustrarse. Esta es una propuesta de 30 minutos pensada para quien lleva poco tiempo tocando.",
    },
    { type: "h2", text: "Antes de empezar: afina" },
    {
      type: "p",
      text: "Dedica el primer minuto a afinar, con un afinador de pinza o una aplicación. Practicar desafinado acostumbra el oído a sonidos incorrectos y hace que todo suene peor de lo que lo estás tocando.",
    },
    { type: "h2", text: "1. Calentamiento (5 minutos)" },
    {
      type: "p",
      text: "Un ejercicio cromático clásico: en la sexta cuerda, pisa los trastes 1, 2, 3 y 4 con los dedos índice, medio, anular y meñique, un dedo por traste, y repite en cada cuerda hasta llegar a la primera. Despacio, buscando que cada nota suene limpia y sin apretar más de la cuenta. Si notas tensión en la mano o el antebrazo, para, suelta la mano y sigue más lento.",
    },
    { type: "h2", text: "2. Cambios de acordes (10 minutos)" },
    {
      type: "p",
      text: "Elige solo dos acordes, por ejemplo Mi menor y Do mayor, o Sol y Re, y alterna entre ellos. Un buen ejercicio es contar cuántos cambios limpios haces en un minuto, apuntarlo y repetirlo otro día: verás que el número sube. Cuando una pareja salga con soltura, añade otro acorde. Los acordes abiertos más útiles para empezar son Mi menor, La menor, Re, Do, Sol y Mi mayor.",
    },
    {
      type: "ul",
      items: [
        "Visualiza la forma del acorde siguiente antes de levantar los dedos del actual.",
        "Busca un dedo que pueda quedarse en la misma cuerda, o deslizarse por ella, entre los dos acordes: te sirve de guía.",
        "Si alguna cuerda no suena, toca el acorde nota a nota para encontrar cuál es y qué dedo la está tapando.",
      ],
    },
    { type: "h2", text: "3. Ritmo con metrónomo (7 minutos)" },
    {
      type: "p",
      text: "Pon el metrónomo lento, entre 60 y 70 pulsaciones por minuto, y rasguea un acorde en negras: un golpe hacia abajo en cada pulso. Cuando vaya bien, prueba con corcheas: abajo en el pulso y arriba entre medias. Después combina el ritmo con los cambios de acordes del bloque anterior sin detener la mano derecha aunque la izquierda llegue tarde: mantener el pulso es más importante que un acorde perfecto.",
    },
    { type: "h2", text: "4. Una canción (8 minutos)" },
    {
      type: "p",
      text: "Elige una canción sencilla que use los acordes que estás practicando y trabájala por partes: primero la estrofa, luego el estribillo. Tocar música de verdad es lo que da sentido a todo lo anterior, y es la parte que más motiva.",
    },
    { type: "h2", text: "Consejos para las primeras semanas" },
    {
      type: "ul",
      items: [
        "Mejor 20 o 30 minutos al día que dos horas el fin de semana: las yemas se endurecen poco a poco y las manos aprenden con la repetición frecuente.",
        "Que duelan las yemas al principio es normal; que duela la muñeca o el antebrazo, no. Si pasa, revisa la postura y descansa.",
        "No aprietes más de lo necesario: pisa justo detrás del traste, no encima ni en mitad de la casilla.",
        "Grábate un minuto de vez en cuando. Escucharte desde fuera ayuda a detectar lo que no notas mientras tocas.",
      ],
    },
    { type: "h2", text: "Cómo organizarla con Fermança" },
    {
      type: "p",
      text: "Crea una sesión con estos cuatro bloques (calentamiento, acordes, ritmo y canción) y guárdala como plantilla. El cronómetro irá pasando de un bloque a otro y te avisará en cada cambio, y en el bloque de ritmo puedes abrir el metrónomo de la propia sesión. Con el tiempo, las rachas y las estadísticas te enseñarán cuánto has practicado cada semana.",
    },
  ],
};

/** Orden de la lista de /guias (y de "Más guías"). */
export const GUIDES: Guide[] = [PRACTICE_ROUTINE, CONSISTENCY, GUITAR_BEGINNERS];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
