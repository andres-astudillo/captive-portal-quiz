import { kv } from '@vercel/kv';

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  explanation?: string;
}

export interface UserSession {
  mac: string;
  name: string;
  email: string;
  phone: string;
  connectedAt: string;
  expiresAt: string;
  correctAnswers: number;
  totalAttempts: number;
}

// Pool de preguntas predefinidas (puedes agregar más desde el admin)
export const defaultQuestions: Question[] = [
  // Cultura General
  {
    id: '1',
    question: '¿Cuál es la capital de Argentina?',
    options: ['Córdoba', 'Buenos Aires', 'Mendoza', 'Rosario'],
    correctAnswer: 1,
    category: 'Cultura General',
    explanation: 'Buenos Aires es la capital federal de Argentina desde 1880. Es también la ciudad más poblada del país, con más de 3 millones de habitantes en el área metropolitana.'
  },
  {
    id: '2',
    question: '¿En qué año llegó el hombre a la Luna?',
    options: ['1965', '1969', '1972', '1975'],
    correctAnswer: 1,
    category: 'Cultura General',
    explanation: 'El 20 de julio de 1969, la misión Apolo 11 de la NASA aterrizó en la Luna. Neil Armstrong fue el primer ser humano en pisar la superficie lunar, seguido por Buzz Aldrin.'
  },
  {
    id: '3',
    question: '¿Cuál es el río más largo del mundo?',
    options: ['Nilo', 'Amazonas', 'Yangtsé', 'Mississippi'],
    correctAnswer: 0,
    category: 'Cultura General',
    explanation: 'El Nilo mide aproximadamente 6.650 km y es considerado el río más largo del mundo. El Amazonas, aunque tiene mayor caudal, es algo más corto en longitud.'
  },
  {
    id: '4',
    question: '¿Quién pintó la Mona Lisa?',
    options: ['Van Gogh', 'Picasso', 'Leonardo da Vinci', 'Miguel Ángel'],
    correctAnswer: 2,
    category: 'Cultura General',
    explanation: 'Leonardo da Vinci pintó la Mona Lisa entre 1503 y 1519. Actualmente se exhibe en el Museo del Louvre en París y es considerada la obra de arte más famosa del mundo.'
  },
  {
    id: '5',
    question: '¿Cuántos continentes hay en el mundo?',
    options: ['5', '6', '7', '8'],
    correctAnswer: 2,
    category: 'Cultura General',
    explanation: 'El modelo más usado divide el mundo en 7 continentes: África, Antártida, Asia, Europa, América del Norte, América del Sur y Oceanía. En Argentina se suele enseñar el modelo de 5 o 6 continentes.'
  },
  {
    id: '6',
    question: '¿Por qué es famosa Mendoza?',
    options: ['Por sus playas', 'Por su vino', 'Por su selva', 'Por sus rascacielos'],
    correctAnswer: 1,
    category: 'Mendoza',
    explanation: 'Mendoza es reconocida mundialmente como una de las mejores regiones vitivinícolas del planeta. Su clima seco, la altitud y el agua del deshielo andino crean condiciones ideales para el cultivo de la vid, especialmente el Malbec.'
  },
  {
    id: '7',
    question: '¿Cuál es el pico más alto cerca de Mendoza?',
    options: ['Cerro Torre', 'Aconcagua', 'Fitz Roy', 'Lanín'],
    correctAnswer: 1,
    category: 'Mendoza',
    explanation: 'El Aconcagua, con 6.961 metros sobre el nivel del mar, es el pico más alto del hemisferio occidental y del hemisferio sur. Está ubicado en la provincia de Mendoza, cerca de la frontera con Chile.'
  },
  {
    id: '8',
    question: '¿Qué uva caracteriza a los vinos de Mendoza?',
    options: ['Chardonnay', 'Merlot', 'Malbec', 'Cabernet'],
    correctAnswer: 2,
    category: 'Mendoza',
    explanation: 'El Malbec es la uva emblemática de Mendoza y de Argentina. Originaria de Francia, encontró en Mendoza su tierra ideal y hoy los Malbec argentinos son reconocidos como los mejores del mundo.'
  },
  {
    id: '9',
    question: '¿Qué significa WiFi?',
    options: ['Wireless Fidelity', 'Wide Fiber', 'Web Interface', 'Wireless Internet'],
    correctAnswer: 0,
    category: 'Tecnología',
    explanation: 'WiFi significa "Wireless Fidelity" (Fidelidad Inalámbrica). Es una tecnología que permite la conexión a internet sin cables, usando ondas de radio. El estándar más usado actualmente es el 802.11.'
  },
  {
    id: '10',
    question: '¿Quién fundó Microsoft?',
    options: ['Steve Jobs', 'Bill Gates', 'Mark Zuckerberg', 'Elon Musk'],
    correctAnswer: 1,
    category: 'Tecnología',
    explanation: 'Bill Gates co-fundó Microsoft junto a Paul Allen en 1975. La empresa desarrolló el sistema operativo MS-DOS y luego Windows, convirtiéndose en la compañía de software más importante del mundo.'
  },
  {
    id: '11',
    question: '¿Cuántas cuerdas tiene una guitarra estándar?',
    options: ['4', '5', '6', '7'],
    correctAnswer: 2,
    category: 'Música',
    explanation: 'La guitarra estándar tiene 6 cuerdas, afinadas (de más gruesa a más fina): Mi, La, Re, Sol, Si, Mi. El bajo eléctrico tiene 4 cuerdas y algunas guitarras especiales pueden tener 7 o 12.'
  },
  {
    id: '12',
    question: '¿Qué instrumento es conocido como "el rey de los instrumentos"?',
    options: ['Piano', 'Violín', 'Órgano', 'Trompeta'],
    correctAnswer: 2,
    category: 'Música',
    explanation: 'El órgano es llamado "el rey de los instrumentos" por su enorme tamaño, complejidad y poder sonoro. Mozart lo describió así. Los grandes órganos de catedral pueden tener miles de tubos y varios teclados.'
  },
  {
    id: '13',
    question: '¿Quién dirigió "El Padrino"?',
    options: ['Steven Spielberg', 'Martin Scorsese', 'Francis Ford Coppola', 'Quentin Tarantino'],
    correctAnswer: 2,
    category: 'Cine',
    explanation: 'Francis Ford Coppola dirigió El Padrino en 1972, basada en la novela de Mario Puzo. Ganó el Oscar a Mejor Película y es considerada una de las mejores películas de la historia del cine.'
  },
  {
    id: '14',
    question: '¿En qué año se estrenó la primera película de Star Wars?',
    options: ['1975', '1977', '1979', '1980'],
    correctAnswer: 1,
    category: 'Cine',
    explanation: 'Star Wars: Episode IV – A New Hope se estrenó el 25 de mayo de 1977. Fue dirigida por George Lucas y revolucionó los efectos especiales y el cine de ciencia ficción para siempre.'
  },
  {
    id: '15',
    question: '¿Cuántos jugadores tiene un equipo de fútbol en el campo?',
    options: ['9', '10', '11', '12'],
    correctAnswer: 2,
    category: 'Deportes',
    explanation: 'Cada equipo de fútbol tiene 11 jugadores en el campo, incluyendo el arquero. Un equipo puede jugar con menos jugadores si recibe expulsiones, pero nunca con menos de 7.'
  },
  {
    id: '16',
    question: '¿En qué deporte se usa una raqueta y una pelota amarilla?',
    options: ['Badminton', 'Squash', 'Tenis', 'Paddle'],
    correctAnswer: 2,
    category: 'Deportes',
    explanation: 'El tenis utiliza raquetas y pelotas de color amarillo-verde fluorescente (oficialmente "optic yellow"). Este color fue adoptado en 1972 para mejorar la visibilidad en las transmisiones televisivas.'
  },
  {
    id: '17',
    question: '¿En qué año cayó el Muro de Berlín?',
    options: ['1987', '1989', '1991', '1993'],
    correctAnswer: 1,
    category: 'Historia',
    explanation: 'El Muro de Berlín cayó el 9 de noviembre de 1989, poniendo fin a la división de Alemania. Había sido construido en 1961 para separar Berlín Oriental (comunista) de Berlín Occidental.'
  },
  {
    id: '18',
    question: '¿Quién fue el primer presidente de Argentina?',
    options: ['Juan Manuel de Rosas', 'Bernardino Rivadavia', 'Domingo Sarmiento', 'Bartolomé Mitre'],
    correctAnswer: 1,
    category: 'Historia',
    explanation: 'Bernardino Rivadavia fue el primer presidente constitucional de Argentina, gobernando entre 1826 y 1827. Su mandato fue breve y convulso, en un país que aún buscaba organizarse como nación.'
  },
  {
    id: '19',
    question: '¿Cuál es el planeta más grande del sistema solar?',
    options: ['Saturno', 'Júpiter', 'Urano', 'Neptuno'],
    correctAnswer: 1,
    category: 'Ciencia',
    explanation: 'Júpiter es el planeta más grande del sistema solar. Su diámetro es 11 veces el de la Tierra y su masa es 2,5 veces la de todos los demás planetas juntos. Su característica más famosa es la Gran Mancha Roja, una tormenta gigante.'
  },
  {
    id: '20',
    question: '¿Cuántos huesos tiene el cuerpo humano adulto?',
    options: ['186', '206', '226', '246'],
    correctAnswer: 1,
    category: 'Ciencia',
    explanation: 'El cuerpo humano adulto tiene 206 huesos. Los bebés nacen con alrededor de 270-300 huesos, que se van fusionando durante el crecimiento. El hueso más pequeño es el estribo, en el oído.'
  }
];

// Inicializar preguntas en KV si no existen
export async function initializeQuestions() {
  const existing = await kv.get('questions');
  if (!existing) {
    await kv.set('questions', defaultQuestions);
  }
}

// Obtener todas las preguntas
export async function getQuestions(): Promise<Question[]> {
  const questions = await kv.get<Question[]>('questions');
  return questions || defaultQuestions;
}

// Obtener N preguntas aleatorias
export async function getRandomQuestions(count: number): Promise<Question[]> {
  const allQuestions = await getQuestions();
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Guardar pregunta
export async function saveQuestion(question: Question) {
  const questions = await getQuestions();
  const index = questions.findIndex(q => q.id === question.id);
  
  if (index >= 0) {
    questions[index] = question;
  } else {
    questions.push(question);
  }
  
  await kv.set('questions', questions);
}

// Eliminar pregunta
export async function deleteQuestion(id: string) {
  const questions = await getQuestions();
  const filtered = questions.filter(q => q.id !== id);
  await kv.set('questions', filtered);
}

// Guardar sesión de usuario
export async function saveUserSession(session: UserSession) {
  await kv.set(`session:${session.mac}`, session);
  await kv.expire(`session:${session.mac}`, 24 * 60 * 60); // 1 día
  await kv.lpush('users', session);
}

// Eliminar un usuario por MAC
export async function deleteUserSession(mac: string) {
  await kv.del(`session:${mac}`);
  const all = await getAllUsers();
  const remaining = all.filter(u => u.mac !== mac);
  await kv.del('users');
  for (const u of remaining.slice().reverse()) {
    await kv.lpush('users', u);
  }
}

// Eliminar todos los usuarios
export async function deleteAllUsers() {
  const all = await getAllUsers();
  await Promise.all(all.map(u => kv.del(`session:${u.mac}`)));
  await kv.del('users');
}

// Obtener sesión de usuario
export async function getUserSession(mac: string): Promise<UserSession | null> {
  return await kv.get<UserSession>(`session:${mac}`);
}

// Verificar si el usuario está autorizado
export async function isUserAuthorized(mac: string): Promise<boolean> {
  const session = await getUserSession(mac);
  if (!session) return false;
  
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  
  return now < expiresAt;
}

// Obtener todos los usuarios conectados
export async function getAllUsers(): Promise<UserSession[]> {
  const users = await kv.lrange('users', 0, -1);
  return users as unknown as UserSession[];
}

// Obtener estadísticas
export async function getStats() {
  const users = await getAllUsers();
  const activeUsers = users.filter(u => new Date(u.expiresAt) > new Date());
  
  return {
    totalUsers: users.length,
    activeUsers: activeUsers.length,
    averageCorrectAnswers: users.reduce((acc, u) => acc + u.correctAnswers, 0) / users.length || 0,
    averageAttempts: users.reduce((acc, u) => acc + u.totalAttempts, 0) / users.length || 0
  };
}
