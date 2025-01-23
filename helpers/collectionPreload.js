const collections = [
  {
    title: 'Leyendas de la Naturaleza',
    subtitle: 'Historias fantásticas inspiradas en los elementos naturales',
    summary:
      'Una colección de relatos fantásticos que giran en torno a la naturaleza y sus elementos sobrenaturales, desde vientos misteriosos hasta monstruos ocultos en los bosques.',
    posts: [
      '67917f22dde3f79fd06ecc39', // El resplandor en el cielo de la Pampa
      '67917f22dde3f79fd06ecc42', // El mapa del navegante perdido
    ],
    createdAt: '2025-01-01T10:00:00Z',
    postedAt: '2025-01-10T10:00:00Z',
  },
  {
    title: 'Criaturas Míticas',
    subtitle: 'Los seres que habitan nuestras leyendas',
    summary:
      'Historias que exploran criaturas míticas y monstruos legendarios, desde el corazón de la selva hasta las profundidades del río Paraná.',
    posts: [
      '67917f22dde3f79fd06ecc3c', // La bestia de la Cordillera
      '67917f22dde3f79fd06ecc51', // La criatura del río Paraná
    ],
    createdAt: '2025-01-05T10:00:00Z',
    postedAt: '2025-01-12T10:00:00Z',
  },
  {
    title: 'Relatos del Fin del Mundo',
    subtitle: 'Historias apocalípticas y de supervivencia',
    summary:
      'Cuentos de lo desconocido, de catástrofes naturales y eventos sobrenaturales que alteran el curso de la humanidad.',
    posts: [
      '67917f22dde3f79fd06ecc45', // El último mensaje del chamán
      '67917f22dde3f79fd06ecc33', // La ciudad flotante de la selva
    ],
    createdAt: '2025-01-08T10:00:00Z',
    postedAt: '2025-01-15T10:00:00Z',
  },
  {
    title: 'El Misterio del Sur',
    subtitle: 'Aventura en los confines del país',
    summary:
      'Historias que se desarrollan en el sur de Argentina, explorando misterios ancestrales, laberintos de ruinas y secretos perdidos.',
    posts: [
      '67917f22dde3f79fd06ecc57', // El espejo del tiempo en el sur
      '67917f22dde3f79fd06ecc5a', // El laberinto de las ruinas de Catamarca
    ],
    createdAt: '2025-01-03T10:00:00Z',
    postedAt: '2025-01-14T10:00:00Z',
  },
  {
    title: 'Ecos de la Pampa',
    subtitle: 'Historias de lo sobrenatural en la vastedad pampeana',
    summary:
      'Un conjunto de relatos que exploran los fenómenos inexplicables que ocurren en las vastas llanuras de la Pampa.',
    posts: [
      '67917f22dde3f79fd06ecc39', // El resplandor en el cielo de la Pampa
      '67917f22dde3f79fd06ecc4b', // El lago del silencio
    ],
    createdAt: '2025-01-10T10:00:00Z',
    postedAt: '2025-01-17T10:00:00Z',
  },
  {
    title: 'Historias de la Selva',
    subtitle: 'Relatos donde la jungla cobra vida',
    summary:
      'Cuentos de la selva argentina, donde la naturaleza toma un papel fundamental y se encuentran espíritus ancestrales y criaturas misteriosas.',
    posts: [
      '67917f22dde3f79fd06ecc33', // La ciudad flotante de la selva
      '67917f22dde3f79fd06ecc45', // El último mensaje del chamán
    ],
    createdAt: '2025-01-07T10:00:00Z',
    postedAt: '2025-01-13T10:00:00Z',
  },
  {
    title: 'Ríos y Lagos Encantados',
    subtitle: 'Relatos de aguas misteriosas',
    summary:
      'Relatos fantásticos que giran en torno a ríos, lagos y cuerpos de agua con poderes sobrenaturales o secretos escondidos en sus profundidades.',
    posts: [
      '67917f22dde3f79fd06ecc4b', // El lago del silencio
      '67917f22dde3f79fd06ecc3f', // La sombra del río Paraná
    ],
    createdAt: '2025-01-09T10:00:00Z',
    postedAt: '2025-01-16T10:00:00Z',
  },
  {
    title: 'Aventuras del Pasado',
    subtitle: 'Historias donde el tiempo se detiene',
    summary:
      'Relatos donde el pasado y el presente se encuentran, desenterrando secretos de tiempos antiguos y desafiando las reglas del tiempo.',
    posts: [
      '67917f22dde3f79fd06ecc54', // El reloj de arena de los dioses
      '67917f22dde3f79fd06ecc51', // La criatura del río Paraná
    ],
    createdAt: '2025-01-06T10:00:00Z',
    postedAt: '2025-01-18T10:00:00Z',
  },
  {
    title: 'Misterios del Desierto',
    subtitle: 'Desafíos en la inmensidad árida',
    summary:
      'Historias que exploran los secretos ocultos en los desiertos de Argentina, con elementos sobrenaturales y seres misteriosos.',
    posts: [
      '67917f22dde3f79fd06ecc4e', // El fuego del desierto
      '67917f22dde3f79fd06ecc39', // El resplandor en el cielo de la Pampa
    ],
    createdAt: '2025-01-12T10:00:00Z',
    postedAt: '2025-01-19T10:00:00Z',
  },
  {
    title: 'Historias de los Elementos',
    subtitle: 'La naturaleza como protagonista',
    summary:
      'Una colección de relatos en los que los elementos de la naturaleza (agua, aire, tierra, fuego) cobran vida y son los protagonistas principales.',
    posts: [
      '67917f22dde3f79fd06ecc36', // El guardián del lago
      '67917f22dde3f79fd06ecc42', // El mapa del navegante perdido
    ],
    createdAt: '2025-01-11T10:00:00Z',
    postedAt: '2025-01-20T10:00:00Z',
  },
  {
    title: 'Héroes de la Cordillera',
    subtitle: 'Las leyendas más antiguas de la montaña',
    summary:
      'Una colección que explora las historias de héroes, monstruos y secretos ocultos en las montañas argentinas, donde lo sobrenatural se mezcla con la tradición.',
    posts: [
      '67917f22dde3f79fd06ecc3c', // La bestia de la Cordillera
      '67917f22dde3f79fd06ecc4e', // El fuego del desierto
      '67917f22dde3f79fd06ecc36', // El guardián del lago
    ],
    createdAt: '2025-01-14T10:00:00Z',
    postedAt: '2025-01-18T10:00:00Z',
  },
  {
    title: 'El Legado de los Vientos',
    subtitle: 'Relatos de antiguos espíritus de la naturaleza',
    summary:
      'Relatos de espíritus ancestrales que se manifiestan a través de los vientos, trayendo consigo profecías y secretos olvidados.',
    posts: [
      '67917f22dde3f79fd06ecc33', // La ciudad flotante de la selva
      '67917f22dde3f79fd06ecc45', // El último mensaje del chamán
      '67917f22dde3f79fd06ecc39', // El resplandor en el cielo de la Pampa
    ],
    createdAt: '2025-01-13T10:00:00Z',
    postedAt: '2025-01-20T10:00:00Z',
  },
  {
    title: 'Los Misterios del Río',
    subtitle: 'Historias de seres acuáticos y magia ancestral',
    summary:
      'Historias donde los ríos de Argentina se convierten en la casa de seres misteriosos, guardias de antiguos secretos.',
    posts: [
      '67917f22dde3f79fd06ecc4b', // El lago del silencio
      '67917f22dde3f79fd06ecc51', // La criatura del río Paraná
      '67917f22dde3f79fd06ecc3f', // La sombra del río Paraná
    ],
    createdAt: '2025-01-15T10:00:00Z',
    postedAt: '2025-01-21T10:00:00Z',
  },
  {
    title: 'La Conjura de la Selva',
    subtitle: 'Relatos de magia y rituales secretos en la jungla',
    summary:
      'Cuentos sobre rituales olvidados, chamanes misteriosos y criaturas que habitan las profundidades de la selva argentina.',
    posts: [
      '67917f22dde3f79fd06ecc33', // La ciudad flotante de la selva
      '67917f22dde3f79fd06ecc42', // El mapa del navegante perdido
    ],
    createdAt: '2025-01-12T10:00:00Z',
    postedAt: '2025-01-17T10:00:00Z',
  },
  {
    title: 'La Magia de la Tierra',
    subtitle: 'Historias que celebran la conexión con la naturaleza',
    summary:
      'Una colección que explora la relación entre los humanos y la tierra, donde la naturaleza es protagonista y los seres humanos enfrentan lo sobrenatural.',
    posts: [
      '67917f22dde3f79fd06ecc45', // El último mensaje del chamán
      '67917f22dde3f79fd06ecc36', // El guardián del lago
      '67917f22dde3f79fd06ecc39', // El resplandor en el cielo de la Pampa
    ],
    createdAt: '2025-01-18T10:00:00Z',
    postedAt: '2025-01-23T10:00:00Z',
  },
  {
    title: 'El Camino del Navegante',
    subtitle: 'Historias de travesías y descubrimientos',
    summary:
      'Relatos sobre viajes, exploraciones y misterios relacionados con el mar y los navegantes del sur.',
    posts: [
      '67917f22dde3f79fd06ecc42', // El mapa del navegante perdido
      '67917f22dde3f79fd06ecc54', // El reloj de arena de los dioses
      '67917f22dde3f79fd06ecc5a', // El laberinto de las ruinas de Catamarca
    ],
    createdAt: '2025-01-16T10:00:00Z',
    postedAt: '2025-01-22T10:00:00Z',
  },
  {
    title: 'Tiempos Perdidos',
    subtitle: 'Relatos que trascienden el tiempo',
    summary:
      'Historias en las que el tiempo juega un papel crucial, desde relojes mágicos hasta viajeros que descubren secretos de épocas olvidadas.',
    posts: [
      '67917f22dde3f79fd06ecc54', // El reloj de arena de los dioses
      '67917f22dde3f79fd06ecc57', // El espejo del tiempo en el sur
      '67917f22dde3f79fd06ecc5a', // El laberinto de las ruinas de Catamarca
    ],
    createdAt: '2025-01-17T10:00:00Z',
    postedAt: '2025-01-24T10:00:00Z',
  },
  {
    title: 'La Magia de los Elementos',
    subtitle: 'Historias de magia en la naturaleza',
    summary:
      'Relatos donde los elementos de la naturaleza son manipulados por fuerzas mágicas, desde el fuego hasta el agua.',
    posts: [
      '67917f22dde3f79fd06ecc4e', // El fuego del desierto
      '67917f22dde3f79fd06ecc36', // El guardián del lago
      '67917f22dde3f79fd06ecc39', // El resplandor en el cielo de la Pampa
    ],
    createdAt: '2025-01-10T10:00:00Z',
    postedAt: '2025-01-19T10:00:00Z',
  },
  {
    title: 'La Ciudad Perdida',
    subtitle: 'Misterios de civilizaciones antiguas',
    summary:
      'Cuentos sobre ruinas olvidadas, ciudades perdidas y secretos ancestrales que resurgen del olvido.',
    posts: [
      '67917f22dde3f79fd06ecc5a', // El laberinto de las ruinas de Catamarca
      '67917f22dde3f79fd06ecc57', // El espejo del tiempo en el sur
      '67917f22dde3f79fd06ecc51', // La criatura del río Paraná
    ],
    createdAt: '2025-01-11T10:00:00Z',
    postedAt: '2025-01-20T10:00:00Z',
  },
  {
    title: 'Ecos del Pasado',
    subtitle: 'Historias donde el pasado regresa para desafiar el presente',
    summary:
      'Cuentos en los que los ecos del pasado cobran vida, desenterrando secretos olvidados que afectan el presente.',
    posts: [
      '67917f22dde3f79fd06ecc3c', // La bestia de la Cordillera
      '67917f22dde3f79fd06ecc57', // El espejo del tiempo en el sur
      '67917f22dde3f79fd06ecc39', // El resplandor en el cielo de la Pampa
    ],
    createdAt: '2025-01-09T10:00:00Z',
    postedAt: '2025-01-14T10:00:00Z',
  },
  {
    title: 'El Sendero de los Espíritus',
    subtitle: 'Cuentos sobre lo sobrenatural en las montañas',
    summary:
      'Una colección de relatos en los que la montaña es el escenario donde se manifiestan espíritus y leyendas ancestrales.',
    posts: [
      '67917f22dde3f79fd06ecc3c', // La bestia de la Cordillera
      '67917f22dde3f79fd06ecc45', // El último mensaje del chamán
      '67917f22dde3f79fd06ecc48', // La flor de la luna
    ],
    createdAt: '2025-01-16T10:00:00Z',
    postedAt: '2025-01-21T10:00:00Z',
  },
  {
    title: 'Voces del Pasado',
    subtitle: 'Relatos donde los muertos regresan para contar su historia',
    summary:
      'Historias de almas que no descansan y buscan relatar su vida o desvelar misterios que los afectan desde el más allá.',
    posts: [
      '67917f22dde3f79fd06ecc39', // El resplandor en el cielo de la Pampa
      '67917f22dde3f79fd06ecc57', // El espejo del tiempo en el sur
      '67917f22dde3f79fd06ecc5a', // El laberinto de las ruinas de Catamarca
    ],
    createdAt: '2025-01-18T10:00:00Z',
    postedAt: '2025-01-23T10:00:00Z',
  },
  {
    title: 'Cuentos del Fin del Mundo',
    subtitle: 'Relatos que exploran el fin de las civilizaciones',
    summary:
      'Historias que tratan sobre el fin de las civilizaciones en el sur de Argentina, desde catástrofes naturales hasta colapsos espirituales.',
    posts: [
      '67917f22dde3f79fd06ecc48', // La flor de la luna
      '67917f22dde3f79fd06ecc42', // El mapa del navegante perdido
      '67917f22dde3f79fd06ecc4b', // El lago del silencio
    ],
    createdAt: '2025-01-14T10:00:00Z',
    postedAt: '2025-01-19T10:00:00Z',
  },
  {
    title: 'Los Guardianes de la Tierra',
    subtitle: 'Cuentos sobre seres que protegen la naturaleza',
    summary:
      'Una colección de historias sobre seres mágicos que habitan los rincones más remotos de la naturaleza argentina y se encargan de protegerla.',
    posts: [
      '67917f22dde3f79fd06ecc33', // La ciudad flotante de la selva
      '67917f22dde3f79fd06ecc3f', // La sombra del río Paraná
      '67917f22dde3f79fd06ecc45', // El último mensaje del chamán
    ],
    createdAt: '2025-01-10T10:00:00Z',
    postedAt: '2025-01-15T10:00:00Z',
  },
  {
    title: 'El Laberinto de la Mente',
    subtitle: 'Historias de enigmas y confusión psicológica',
    summary:
      'Cuentos que exploran los límites de la percepción humana, donde la mente juega un papel crucial y la realidad se distorsiona.',
    posts: [
      '67917f22dde3f79fd06ecc54', // El reloj de arena de los dioses
      '67917f22dde3f79fd06ecc57', // El espejo del tiempo en el sur
      '67917f22dde3f79fd06ecc3c', // La bestia de la Cordillera
    ],
    createdAt: '2025-01-12T10:00:00Z',
    postedAt: '2025-01-20T10:00:00Z',
  },
  {
    title: 'Cuentos de la Tierra Ancestral',
    subtitle: 'Relatos que exploran las raíces de la cultura argentina',
    summary:
      'Relatos que se sumergen en las raíces de la cultura indígena, buscando el entendimiento de los orígenes y las leyendas ancestrales.',
    posts: [
      '67917f22dde3f79fd06ecc42', // El mapa del navegante perdido
      '67917f22dde3f79fd06ecc51', // La criatura del río Paraná
      '67917f22dde3f79fd06ecc39', // El resplandor en el cielo de la Pampa
    ],
    createdAt: '2025-01-13T10:00:00Z',
    postedAt: '2025-01-22T10:00:00Z',
  },
  {
    title: 'Sombras en la Pampa',
    subtitle: 'Historias que exploran lo oculto en la vasta llanura',
    summary:
      'Historias de misterios y criaturas oscuras que acechan en la vasta extensión de la Pampa argentina.',
    posts: [
      '67917f22dde3f79fd06ecc3f', // La sombra del río Paraná
      '67917f22dde3f79fd06ecc33', // La ciudad flotante de la selva
      '67917f22dde3f79fd06ecc45', // El último mensaje del chamán
    ],
    createdAt: '2025-01-11T10:00:00Z',
    postedAt: '2025-01-16T10:00:00Z',
  },
  {
    title: 'El Último Guerrero',
    subtitle: 'Relatos épicos de luchadores solitarios',
    summary:
      'Cuentos sobre guerreros solitarios, luchadores que desafían lo imposible en un mundo lleno de magia y misterio.',
    posts: [
      '67917f22dde3f79fd06ecc42', // El mapa del navegante perdido
      '67917f22dde3f79fd06ecc36', // El guardián del lago
      '67917f22dde3f79fd06ecc5a', // El laberinto de las ruinas de Catamarca
    ],
    createdAt: '2025-01-09T10:00:00Z',
    postedAt: '2025-01-18T10:00:00Z',
  },
  {
    title: 'El Secreto del Chamán',
    subtitle: 'Cuentos de sabiduría ancestral y magia',
    summary:
      'Historias de chamanes que transmiten sabiduría ancestral y enfrentan fuerzas sobrenaturales.',
    posts: [
      '67917f22dde3f79fd06ecc45', // El último mensaje del chamán
      '67917f22dde3f79fd06ecc4b', // El lago del silencio
      '67917f22dde3f79fd06ecc48', // La flor de la luna
    ],
    createdAt: '2025-01-08T10:00:00Z',
    postedAt: '2025-01-15T10:00:00Z',
  },
  {
    title: 'El Horizonte Infinito',
    subtitle: 'Relatos sobre lo inalcanzable',
    summary:
      'Historias sobre sueños, metas inalcanzables y horizontes que se alejan mientras los personajes luchan por alcanzarlos.',
    posts: [
      '67917f22dde3f79fd06ecc39', // El resplandor en el cielo de la Pampa
      '67917f22dde3f79fd06ecc33', // La ciudad flotante de la selva
      '67917f22dde3f79fd06ecc42', // El mapa del navegante perdido
    ],
    createdAt: '2025-01-07T10:00:00Z',
    postedAt: '2025-01-14T10:00:00Z',
  },
  {
    title: 'Los Espíritus del Agua',
    subtitle: 'Relatos de agua, ríos y lagos con secretos',
    summary:
      'Historias que exploran el misterio de los cuerpos de agua en Argentina, donde los ríos y lagos guardan secretos del pasado.',
    posts: [
      '67917f22dde3f79fd06ecc4b', // El lago del silencio
      '67917f22dde3f79fd06ecc51', // La criatura del río Paraná
      '67917f22dde3f79fd06ecc45', // El último mensaje del chamán
    ],
    createdAt: '2025-01-20T10:00:00Z',
    postedAt: '2025-01-25T10:00:00Z',
  },
  {
    title: 'Tiempos de Guerra y Paz',
    subtitle: 'Historias de lucha y reconciliación',
    summary:
      'Cuentos sobre la guerra, pero también sobre la paz que emerge después de la lucha. Relatos épicos de resistencia y superación.',
    posts: [
      '67917f22dde3f79fd06ecc36', // El guardián del lago
      '67917f22dde3f79fd06ecc33', // La ciudad flotante de la selva
      '67917f22dde3f79fd06ecc57', // El espejo del tiempo en el sur
    ],
    createdAt: '2025-01-18T10:00:00Z',
    postedAt: '2025-01-23T10:00:00Z',
  },
  {
    title: 'El Ojo de la Tormenta',
    subtitle: 'Relatos de caos y orden',
    summary:
      'Historias que exploran los momentos de caos en la naturaleza humana y cómo el orden puede emerger en medio de la tormenta.',
    posts: [
      '67917f22dde3f79fd06ecc39', // El resplandor en el cielo de la Pampa
      '67917f22dde3f79fd06ecc42', // El mapa del navegante perdido
      '67917f22dde3f79fd06ecc5a', // El laberinto de las ruinas de Catamarca
    ],
    createdAt: '2025-01-22T10:00:00Z',
    postedAt: '2025-01-27T10:00:00Z',
  },
  {
    title: 'Misterios del Norte',
    subtitle: 'Leyendas de la región del Noroeste argentino',
    summary:
      'Cuentos que se desarrollan en el norte argentino, explorando leyendas de las montañas, los pueblos y las criaturas míticas de la región.',
    posts: [
      '67917f22dde3f79fd06ecc3c', // La bestia de la Cordillera
      '67917f22dde3f79fd06ecc48', // La flor de la luna
      '67917f22dde3f79fd06ecc5a', // El laberinto de las ruinas de Catamarca
    ],
    createdAt: '2025-01-15T10:00:00Z',
    postedAt: '2025-01-20T10:00:00Z',
  },
  {
    title: 'El Viento y la Memoria',
    subtitle: 'Historias donde el viento es el protagonista',
    summary:
      'Una colección que explora historias donde el viento no es solo un elemento natural, sino un personaje activo en los relatos.',
    posts: [
      '67917f22dde3f79fd06ecc45', // El último mensaje del chamán
      '67917f22dde3f79fd06ecc33', // La ciudad flotante de la selva
      '67917f22dde3f79fd06ecc57', // El espejo del tiempo en el sur
    ],
    createdAt: '2025-01-19T10:00:00Z',
    postedAt: '2025-01-24T10:00:00Z',
  },
  {
    title: 'Rituales Perdidos',
    subtitle: 'La magia ancestral en las tierras argentinas',
    summary:
      'Historias de rituales olvidados y secretos de magia ancestral que sobreviven en lo más profundo de la selva y las montañas.',
    posts: [
      '67917f22dde3f79fd06ecc36', // El guardián del lago
      '67917f22dde3f79fd06ecc4b', // El lago del silencio
      '67917f22dde3f79fd06ecc39', // El resplandor en el cielo de la Pampa
    ],
    createdAt: '2025-01-10T10:00:00Z',
    postedAt: '2025-01-15T10:00:00Z',
  },
  {
    title: 'En las Sombras del Pasado',
    subtitle: 'Relatos de sombras y secretos enterrados',
    summary:
      'Cuentos que exploran los secretos enterrados en el pasado de las ciudades argentinas, donde las sombras revelan historias olvidadas.',
    posts: [
      '67917f22dde3f79fd06ecc54', // El reloj de arena de los dioses
      '67917f22dde3f79fd06ecc51', // La criatura del río Paraná
      '67917f22dde3f79fd06ecc3f', // La sombra del río Paraná
    ],
    createdAt: '2025-01-17T10:00:00Z',
    postedAt: '2025-01-22T10:00:00Z',
  },
  {
    title: 'Tierra de Fuego y Magia',
    subtitle: 'Leyendas mágicas de la Patagonia',
    summary:
      'Relatos de magia antigua y seres mitológicos que habitan la Patagonia argentina, donde la naturaleza y la magia se entrelazan.',
    posts: [
      '67917f22dde3f79fd06ecc48', // La flor de la luna
      '67917f22dde3f79fd06ecc42', // El mapa del navegante perdido
      '67917f22dde3f79fd06ecc5a', // El laberinto de las ruinas de Catamarca
    ],
    createdAt: '2025-01-11T10:00:00Z',
    postedAt: '2025-01-16T10:00:00Z',
  },
  {
    title: 'Cuentos de la Tierra Mística',
    subtitle: 'Relatos sobre la magia de los pueblos originarios',
    summary:
      'Una colección que busca capturar las leyendas de los pueblos originarios de Argentina, sus mitos, magia y la conexión con la tierra.',
    posts: [
      '67917f22dde3f79fd06ecc57', // El espejo del tiempo en el sur
      '67917f22dde3f79fd06ecc45', // El último mensaje del chamán
      '67917f22dde3f79fd06ecc48', // La flor de la luna
    ],
    createdAt: '2025-01-14T10:00:00Z',
    postedAt: '2025-01-19T10:00:00Z',
  },
  {
    title: 'La Aventura Infinita',
    subtitle: 'Relatos de exploración y descubrimientos',
    summary:
      'Historias de exploradores y aventureros que se adentran en tierras desconocidas, buscando secretos ocultos y aventuras épicas.',
    posts: [
      '67917f22dde3f79fd06ecc36', // El guardián del lago
      '67917f22dde3f79fd06ecc33', // La ciudad flotante de la selva
      '67917f22dde3f79fd06ecc5a', // El laberinto de las ruinas de Catamarca
    ],
    createdAt: '2025-01-09T10:00:00Z',
    postedAt: '2025-01-13T10:00:00Z',
  },
];

const images = [
  'https://fastly.picsum.photos/id/1039/1200/400.jpg?hmac=9mwb7fab5wuLv8x32egNpexh0T2SLVu_uTWfEVzqK9w',
  'https://fastly.picsum.photos/id/191/1200/400.jpg?hmac=Op15NyIeU0RyoR1X6OG_Rxk4zpRItWDG8YBmGLkd2iE',
  'https://fastly.picsum.photos/id/22/1200/400.jpg?hmac=jwBmTv5l6LnwMS6SNDW1kWO-skeRm5HYc0o_-fM9FUw',
  'https://fastly.picsum.photos/id/545/1200/400.jpg?hmac=mm_hIRLoK_nQErast5G3dj4FX-SKay0_wqi2xo7-Hj8',
  'https://fastly.picsum.photos/id/329/1200/400.jpg?hmac=1gpAPMjs3y6EIz_aULcuTKDSGlkJuTPfpRvxZjvdcRU',
  'https://fastly.picsum.photos/id/1037/1200/400.jpg?hmac=QvGNwbyTE1OJ9Z1vezAYDgzJfbRi3J6KVinlBKBGO0M',
  'https://fastly.picsum.photos/id/1049/1200/400.jpg?hmac=0HBKh2wMf8SFzxmtU42uNKsZu7sczQq7bmoTWMW1Sso',
  'https://fastly.picsum.photos/id/1013/1200/400.jpg?hmac=26ixI1qaHmdvgHDirVM_VVspHMcrFqCjaUfKW-v06Ns',
  'https://fastly.picsum.photos/id/967/1200/400.jpg?hmac=CpY_f2pB767khlCa4XVGgHya_xfPl5gGQTTwkOW-XxE',
  'https://fastly.picsum.photos/id/615/1200/400.jpg?hmac=VC8a8sGE8Tcohg8jbWAOyCvueGUy68Yrz1wVIuzWQxQ',
  'https://fastly.picsum.photos/id/77/1200/400.jpg?hmac=SXAu7bMVs-Spk7Aq9xAMqLL_fdbVJKeBNZduqM-a_VM',
  'https://fastly.picsum.photos/id/995/1200/400.jpg?hmac=L3ovPxsCJsaHEFMReZX4EgUb--oVfgg-Uml8C7gOLug',
  'https://fastly.picsum.photos/id/34/1200/400.jpg?hmac=pgCg0lLPWgUxnNMcmGYX4Xgy7eOGiSfq6bMISLxMbcI',
  'https://fastly.picsum.photos/id/106/1200/400.jpg?hmac=yvSMswGKcWQ0W7bO6jEs9W_LUUB1VEi8AdhpIPF6f6A',
  'https://fastly.picsum.photos/id/585/1200/400.jpg?hmac=BShwDUQCTqpPSVf6XIJ7FeBC7ZZ21EddIpdmsZ07V8w',
  'https://fastly.picsum.photos/id/685/1200/400.jpg?hmac=Ilvq1fFAHd2CPX9Kkpv8lf31fi0RTxM4qVe-jsHDHiE',
  'https://fastly.picsum.photos/id/905/1200/400.jpg?hmac=5p_Nmd5cmmn6c0b4yAMMYfMrmKBieVMRCrvkuliAcSc',
  'https://fastly.picsum.photos/id/769/1200/400.jpg?hmac=wMqubLxDT4-JEmLtjELSXtjj6YdTEzwsxlEUIZ4EyCo',
  'https://fastly.picsum.photos/id/329/1200/400.jpg?hmac=1gpAPMjs3y6EIz_aULcuTKDSGlkJuTPfpRvxZjvdcRU',
  'https://fastly.picsum.photos/id/219/1200/400.jpg?hmac=xNHT-pL89zX9LyEQ8LuhrRwuYqjt57F9n48IBHZpjPc',
  'https://fastly.picsum.photos/id/16/1200/400.jpg?hmac=LzlkC1sd9QR16zY8II9hIeUngkCLvvMHmVQlxnAS2sI',
  'https://fastly.picsum.photos/id/101/1200/400.jpg?hmac=XD7toxulNuM4Xrivwgu2TF2CZ_LwCz1s-6izKmbe9l4',
  'https://fastly.picsum.photos/id/908/1200/400.jpg?hmac=owX9NHY84ONHuL8hBD6iDOUFtgLOZDX9ir7GIxlGYlo',
  'https://fastly.picsum.photos/id/659/1200/400.jpg?hmac=H8qVQe_yay2lEvlLGQGjwmlt_m-Ub6hEsy6B4gPO_Bc',
  'https://fastly.picsum.photos/id/1025/1200/400.jpg?hmac=XYsuFq03MtuR2GtacHr16qEPUxvK9Zax-pGBuh-J7tw',
  'https://fastly.picsum.photos/id/855/1200/400.jpg?hmac=-YlVUpstR4FQlzSU2Z3q9QRnPVOW0mBRKu4UwTN56_8',
  'https://fastly.picsum.photos/id/767/1200/400.jpg?hmac=H9ixJ7jF4s-0gfLWJbalD3MOXoXjvdlN3KE73ZJl9r4',
  'https://fastly.picsum.photos/id/904/1200/400.jpg?hmac=Na6fJwl6541QmB0QQHEvfu7UHsUGJO3_1c9wM3nbdzQ',
  'https://fastly.picsum.photos/id/357/1200/400.jpg?hmac=HZqLmFDVYidwekq9CtA3aIlc7R95jng55p4ObseIgfI',
  'https://fastly.picsum.photos/id/46/1200/400.jpg?hmac=4mG_T7MSHD4cMqwPtz76UbUop91SHZNOx2dakZbfmhw',
  'https://fastly.picsum.photos/id/857/1200/400.jpg?hmac=aVHZ7bJEOPg7GcLBN6iUYB2oM63MuCFQXQzH-fABN80',
  'https://fastly.picsum.photos/id/52/1200/400.jpg?hmac=Rwc1eNlM9HvpMlsfdz7bZcVRaWspf4XpKqXY7xHpvq4',
  'https://fastly.picsum.photos/id/31/1200/400.jpg?hmac=XpHqJyM05wLQBytJlzgreR9iMsLUeiMpnDpeK3ekhuI',
  'https://fastly.picsum.photos/id/429/1200/400.jpg?hmac=E8bl2PsJNPA2huQePWMoscbIq6i0yUt3orBNc4tm5YU',
  'https://fastly.picsum.photos/id/349/1200/400.jpg?hmac=x_gvfezW5dCTw5p_lqKqsWTNgJJ7guYL0jta8Mdex1s',
  'https://fastly.picsum.photos/id/992/1200/400.jpg?hmac=Y0oacAfIxqA664RG_KzytL-6o79bkeZ__r2xxM-Kk1Q',
  'https://fastly.picsum.photos/id/327/1200/400.jpg?hmac=vf0VonpfzUMaRVkVMqOCya_j8qZHgff074F_3YedTnI',
  'https://fastly.picsum.photos/id/130/1200/400.jpg?hmac=IXKV9KU_Hj3LYA3xIu-IHBSzO8NjPGd9AwsKkIZ3jew',
  'https://fastly.picsum.photos/id/447/1200/400.jpg?hmac=GIKvjayrqYjoqfaX_vImwpe01H0KOACwUNieAXm_4os',
  'https://fastly.picsum.photos/id/318/1200/400.jpg?hmac=VOExeM8DqidYCXjQqLOo1tEpdpM7iz_-bbFRcdgw7w4',
];

module.exports = { collections, images };
