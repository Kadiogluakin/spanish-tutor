#!/usr/bin/env node

// Comprehensive curriculum seeding script - school-level standard
// Populates lesson and vocab tables with extensive A2 and B1 content

const Database = require('better-sqlite3');
const path = require('path');

// Initialize database connection
const dbPath = path.join(__dirname, '..', 'local.db');
const db = new Database(dbPath);

// Comprehensive curriculum data - 27 lessons, 300+ vocabulary items
const curriculum = {
  A1: [
    // Unit 1: Primeros Pasos
    {
      id: 'a1-u1-l1', title: 'Saludos y Presentaciones', cefr: 'A1', unit: 1, lesson: 1,
      objectives: ['Greet people and introduce yourself', 'Learn basic courtesy expressions', 'Use subject pronouns'],
      vocabulary: [
        { spanish: 'hola', english: 'hello', difficulty: 1, tags: ['greeting'] },
        { spanish: 'buenos días', english: 'good morning', difficulty: 1, tags: ['greeting'] },
        { spanish: 'buenas tardes', english: 'good afternoon', difficulty: 1, tags: ['greeting'] },
        { spanish: 'buenas noches', english: 'good evening/night', difficulty: 1, tags: ['greeting'] },
        { spanish: 'adiós', english: 'goodbye', difficulty: 1, tags: ['greeting'] },
        { spanish: 'hasta luego', english: 'see you later', difficulty: 1, tags: ['greeting'] },
        { spanish: 'por favor', english: 'please', difficulty: 1, tags: ['courtesy'] },
        { spanish: 'gracias', english: 'thank you', difficulty: 1, tags: ['courtesy'] },
        { spanish: 'de nada', english: 'you\'re welcome', difficulty: 1, tags: ['courtesy'] },
        { spanish: 'perdón', english: 'excuse me/sorry', difficulty: 1, tags: ['courtesy'] },
        { spanish: 'me llamo...', english: 'my name is...', difficulty: 1, tags: ['introduction'] },
        { spanish: '¿Cómo te llamas?', english: 'What\'s your name?', difficulty: 1, tags: ['introduction'] }
      ],
      estimatedDuration: 25, difficulty: 1
    },
    {
      id: 'a1-u1-l2', title: 'Los Números y la Edad', cefr: 'A1', unit: 1, lesson: 2,
      objectives: ['Count from 0 to 100', 'Ask and tell age', 'Learn basic question formation'],
      vocabulary: [
        { spanish: 'cero', english: 'zero', difficulty: 1, tags: ['numbers'] },
        { spanish: 'uno', english: 'one', difficulty: 1, tags: ['numbers'] },
        { spanish: 'dos', english: 'two', difficulty: 1, tags: ['numbers'] },
        { spanish: 'tres', english: 'three', difficulty: 1, tags: ['numbers'] },
        { spanish: 'cuatro', english: 'four', difficulty: 1, tags: ['numbers'] },
        { spanish: 'cinco', english: 'five', difficulty: 1, tags: ['numbers'] },
        { spanish: 'diez', english: 'ten', difficulty: 1, tags: ['numbers'] },
        { spanish: 'veinte', english: 'twenty', difficulty: 2, tags: ['numbers'] },
        { spanish: 'treinta', english: 'thirty', difficulty: 2, tags: ['numbers'] },
        { spanish: 'cien', english: 'one hundred', difficulty: 2, tags: ['numbers'] },
        { spanish: '¿Cuántos años tienes?', english: 'How old are you?', difficulty: 1, tags: ['age'] },
        { spanish: 'tengo... años', english: 'I am... years old', difficulty: 1, tags: ['age'] }
      ],
      estimatedDuration: 30, difficulty: 1, prerequisites: ['a1-u1-l1']
    },
    {
      id: 'a1-u1-l3', title: 'Países y Nacionalidades', cefr: 'A1', unit: 1, lesson: 3,
      objectives: ['Name countries and nationalities', 'Use ser for origin', 'Ask where someone is from'],
      vocabulary: [
        { spanish: 'España', english: 'Spain', difficulty: 1, tags: ['country'] },
        { spanish: 'México', english: 'Mexico', difficulty: 1, tags: ['country'] },
        { spanish: 'Argentina', english: 'Argentina', difficulty: 1, tags: ['country'] },
        { spanish: 'Estados Unidos', english: 'United States', difficulty: 2, tags: ['country'] },
        { spanish: 'Francia', english: 'France', difficulty: 1, tags: ['country'] },
        { spanish: 'Italia', english: 'Italy', difficulty: 1, tags: ['country'] },
        { spanish: 'español(a)', english: 'Spanish', difficulty: 1, tags: ['nationality'] },
        { spanish: 'mexicano/a', english: 'Mexican', difficulty: 1, tags: ['nationality'] },
        { spanish: 'argentino/a', english: 'Argentinian', difficulty: 2, tags: ['nationality'] },
        { spanish: 'americano/a', english: 'American', difficulty: 1, tags: ['nationality'] },
        { spanish: '¿De dónde eres?', english: 'Where are you from?', difficulty: 1, tags: ['origin'] },
        { spanish: 'soy de...', english: 'I am from...', difficulty: 1, tags: ['origin'] }
      ],
      estimatedDuration: 30, difficulty: 2, prerequisites: ['a1-u1-l2']
    },
    // Unit 2: La Vida Diaria Básica
    {
      id: 'a1-u2-l1', title: 'La Familia', cefr: 'A1', unit: 2, lesson: 1,
      objectives: ['Name family members', 'Use possessive adjectives', 'Describe family relationships'],
      vocabulary: [
        { spanish: 'la familia', english: 'family', difficulty: 1, tags: ['family'] },
        { spanish: 'el padre', english: 'father', difficulty: 1, tags: ['family'] },
        { spanish: 'la madre', english: 'mother', difficulty: 1, tags: ['family'] },
        { spanish: 'el hermano', english: 'brother', difficulty: 1, tags: ['family'] },
        { spanish: 'la hermana', english: 'sister', difficulty: 1, tags: ['family'] },
        { spanish: 'el abuelo', english: 'grandfather', difficulty: 1, tags: ['family'] },
        { spanish: 'la abuela', english: 'grandmother', difficulty: 1, tags: ['family'] },
        { spanish: 'el hijo', english: 'son', difficulty: 1, tags: ['family'] },
        { spanish: 'la hija', english: 'daughter', difficulty: 1, tags: ['family'] },
        { spanish: 'mi', english: 'my', difficulty: 1, tags: ['possessive'] },
        { spanish: 'tu', english: 'your', difficulty: 1, tags: ['possessive'] },
        { spanish: 'su', english: 'his/her/your', difficulty: 2, tags: ['possessive'] }
      ],
      estimatedDuration: 25, difficulty: 2, prerequisites: ['a1-u1-l3']
    },
    {
      id: 'a1-u2-l2', title: 'Los Colores y las Cosas', cefr: 'A1', unit: 2, lesson: 2,
      objectives: ['Name basic colors', 'Identify common objects', 'Use definite and indefinite articles'],
      vocabulary: [
        { spanish: 'rojo/a', english: 'red', difficulty: 1, tags: ['color'] },
        { spanish: 'azul', english: 'blue', difficulty: 1, tags: ['color'] },
        { spanish: 'verde', english: 'green', difficulty: 1, tags: ['color'] },
        { spanish: 'amarillo/a', english: 'yellow', difficulty: 1, tags: ['color'] },
        { spanish: 'negro/a', english: 'black', difficulty: 1, tags: ['color'] },
        { spanish: 'blanco/a', english: 'white', difficulty: 1, tags: ['color'] },
        { spanish: 'la mesa', english: 'table', difficulty: 1, tags: ['object'] },
        { spanish: 'la silla', english: 'chair', difficulty: 1, tags: ['object'] },
        { spanish: 'el libro', english: 'book', difficulty: 1, tags: ['object'] },
        { spanish: 'el bolígrafo', english: 'pen', difficulty: 1, tags: ['object'] },
        { spanish: 'la puerta', english: 'door', difficulty: 1, tags: ['object'] },
        { spanish: 'la ventana', english: 'window', difficulty: 1, tags: ['object'] }
      ],
      estimatedDuration: 30, difficulty: 2, prerequisites: ['a1-u2-l1']
    },
    {
      id: 'a1-u2-l3', title: 'La Casa', cefr: 'A1', unit: 2, lesson: 3,
      objectives: ['Name rooms in a house', 'Describe where things are located', 'Use hay (there is/are)'],
      vocabulary: [
        { spanish: 'la casa', english: 'house', difficulty: 1, tags: ['house'] },
        { spanish: 'la cocina', english: 'kitchen', difficulty: 1, tags: ['house'] },
        { spanish: 'el dormitorio', english: 'bedroom', difficulty: 2, tags: ['house'] },
        { spanish: 'el baño', english: 'bathroom', difficulty: 1, tags: ['house'] },
        { spanish: 'el salón', english: 'living room', difficulty: 2, tags: ['house'] },
        { spanish: 'el jardín', english: 'garden', difficulty: 2, tags: ['house'] },
        { spanish: 'la cama', english: 'bed', difficulty: 1, tags: ['furniture'] },
        { spanish: 'el sofá', english: 'sofa', difficulty: 1, tags: ['furniture'] },
        { spanish: 'la televisión', english: 'television', difficulty: 1, tags: ['furniture'] },
        { spanish: 'hay', english: 'there is/are', difficulty: 1, tags: ['existence'] },
        { spanish: 'en', english: 'in', difficulty: 1, tags: ['preposition'] },
        { spanish: 'sobre', english: 'on', difficulty: 2, tags: ['preposition'] }
      ],
      estimatedDuration: 30, difficulty: 2, prerequisites: ['a1-u2-l2']
    },
    // Unit 3: Tiempo y Actividades
    {
      id: 'a1-u3-l1', title: '¿Qué Hora Es?', cefr: 'A1', unit: 3, lesson: 1,
      objectives: ['Tell time', 'Ask what time it is', 'Use time expressions'],
      vocabulary: [
        { spanish: '¿Qué hora es?', english: 'What time is it?', difficulty: 1, tags: ['time'] },
        { spanish: 'es la una', english: 'it\'s one o\'clock', difficulty: 1, tags: ['time'] },
        { spanish: 'son las dos', english: 'it\'s two o\'clock', difficulty: 1, tags: ['time'] },
        { spanish: 'y media', english: 'and a half', difficulty: 1, tags: ['time'] },
        { spanish: 'y cuarto', english: 'and a quarter', difficulty: 2, tags: ['time'] },
        { spanish: 'menos cuarto', english: 'quarter to', difficulty: 2, tags: ['time'] },
        { spanish: 'la mañana', english: 'morning', difficulty: 1, tags: ['time'] },
        { spanish: 'la tarde', english: 'afternoon', difficulty: 1, tags: ['time'] },
        { spanish: 'la noche', english: 'night', difficulty: 1, tags: ['time'] },
        { spanish: 'temprano', english: 'early', difficulty: 2, tags: ['time'] },
        { spanish: 'tarde', english: 'late', difficulty: 1, tags: ['time'] }
      ],
      estimatedDuration: 35, difficulty: 3, prerequisites: ['a1-u2-l3']
    },
    {
      id: 'a1-u3-l2', title: 'Los Días y los Meses', cefr: 'A1', unit: 3, lesson: 2,
      objectives: ['Name days of the week and months', 'Talk about dates', 'Use calendar expressions'],
      vocabulary: [
        { spanish: 'lunes', english: 'Monday', difficulty: 1, tags: ['days'] },
        { spanish: 'martes', english: 'Tuesday', difficulty: 1, tags: ['days'] },
        { spanish: 'miércoles', english: 'Wednesday', difficulty: 2, tags: ['days'] },
        { spanish: 'jueves', english: 'Thursday', difficulty: 1, tags: ['days'] },
        { spanish: 'viernes', english: 'Friday', difficulty: 1, tags: ['days'] },
        { spanish: 'sábado', english: 'Saturday', difficulty: 1, tags: ['days'] },
        { spanish: 'domingo', english: 'Sunday', difficulty: 1, tags: ['days'] },
        { spanish: 'enero', english: 'January', difficulty: 1, tags: ['months'] },
        { spanish: 'febrero', english: 'February', difficulty: 2, tags: ['months'] },
        { spanish: 'marzo', english: 'March', difficulty: 1, tags: ['months'] },
        { spanish: 'abril', english: 'April', difficulty: 1, tags: ['months'] },
        { spanish: 'mayo', english: 'May', difficulty: 1, tags: ['months'] },
        { spanish: 'hoy', english: 'today', difficulty: 1, tags: ['time'] },
        { spanish: 'mañana', english: 'tomorrow', difficulty: 1, tags: ['time'] }
      ],
      estimatedDuration: 35, difficulty: 2, prerequisites: ['a1-u3-l1']
    },
    {
      id: 'a1-u3-l3', title: 'Actividades Básicas', cefr: 'A1', unit: 3, lesson: 3,
      objectives: ['Talk about basic daily activities', 'Use present tense regular verbs', 'Express likes and dislikes simply'],
      vocabulary: [
        { spanish: 'hablar', english: 'to speak', difficulty: 1, tags: ['verb', 'activity'] },
        { spanish: 'comer', english: 'to eat', difficulty: 1, tags: ['verb', 'activity'] },
        { spanish: 'beber', english: 'to drink', difficulty: 1, tags: ['verb', 'activity'] },
        { spanish: 'vivir', english: 'to live', difficulty: 1, tags: ['verb', 'activity'] },
        { spanish: 'estudiar', english: 'to study', difficulty: 1, tags: ['verb', 'activity'] },
        { spanish: 'trabajar', english: 'to work', difficulty: 1, tags: ['verb', 'activity'] },
        { spanish: 'caminar', english: 'to walk', difficulty: 1, tags: ['verb', 'activity'] },
        { spanish: 'escuchar', english: 'to listen', difficulty: 1, tags: ['verb', 'activity'] },
        { spanish: 'mirar', english: 'to look/watch', difficulty: 1, tags: ['verb', 'activity'] },
        { spanish: 'me gusta', english: 'I like', difficulty: 1, tags: ['preference'] },
        { spanish: 'no me gusta', english: 'I don\'t like', difficulty: 1, tags: ['preference'] }
      ],
      estimatedDuration: 40, difficulty: 3, prerequisites: ['a1-u3-l2']
    }
  ],
  A2: [
    // Unit 1: Mi Vida y Mi Mundo
    {
      id: 'a2-u1-l1', title: '¿Quién Eres?', cefr: 'A2', unit: 1, lesson: 1,
      objectives: ['Introduce yourself with personal information', 'Use ser vs. estar correctly', 'Learn professions and nationalities'],
      vocabulary: [
        { spanish: 'el/la abogado/a', english: 'lawyer', difficulty: 2, tags: ['profession'] },
        { spanish: 'el/la médico/a', english: 'doctor', difficulty: 2, tags: ['profession'] },
        { spanish: 'el/la ingeniero/a', english: 'engineer', difficulty: 3, tags: ['profession'] },
        { spanish: 'el/la profesor(a)', english: 'teacher', difficulty: 1, tags: ['profession'] },
        { spanish: 'alemán/alemana', english: 'German', difficulty: 2, tags: ['nationality'] },
        { spanish: 'español(a)', english: 'Spanish', difficulty: 1, tags: ['nationality'] },
        { spanish: 'mexicano/a', english: 'Mexican', difficulty: 2, tags: ['nationality'] },
        { spanish: 'simpático/a', english: 'nice, friendly', difficulty: 1, tags: ['personality'] },
        { spanish: 'inteligente', english: 'intelligent', difficulty: 2, tags: ['personality'] },
        { spanish: 'trabajador(a)', english: 'hard-working', difficulty: 2, tags: ['personality'] }
      ],
      estimatedDuration: 30, difficulty: 2
    },
    {
      id: 'a2-u1-l2', title: 'Mi Rutina Diaria', cefr: 'A2', unit: 1, lesson: 2,
      objectives: ['Describe daily routine in detail', 'Master reflexive verbs', 'Use time expressions'],
      vocabulary: [
        { spanish: 'despertarse (e>ie)', english: 'to wake up', difficulty: 2, tags: ['routine'] },
        { spanish: 'levantarse', english: 'to get up', difficulty: 2, tags: ['routine'] },
        { spanish: 'ducharse', english: 'to shower', difficulty: 1, tags: ['routine'] },
        { spanish: 'vestirse (e>i)', english: 'to get dressed', difficulty: 3, tags: ['routine'] },
        { spanish: 'desayunar', english: 'to have breakfast', difficulty: 2, tags: ['routine'] },
        { spanish: 'almorzar (o>ue)', english: 'to have lunch', difficulty: 2, tags: ['routine'] },
        { spanish: 'cenar', english: 'to have dinner', difficulty: 2, tags: ['routine'] },
        { spanish: 'acostarse (o>ue)', english: 'to go to bed', difficulty: 2, tags: ['routine'] },
        { spanish: 'por la mañana', english: 'in the morning', difficulty: 1, tags: ['time'] },
        { spanish: 'por la tarde', english: 'in the afternoon', difficulty: 1, tags: ['time'] }
      ],
      estimatedDuration: 35, difficulty: 3, prerequisites: ['a2-u1-l1']
    },
    {
      id: 'a2-u1-l3', title: 'En el Trabajo', cefr: 'A2', unit: 1, lesson: 3,
      objectives: ['Talk about job and workplace', 'Use "hay" for existence', 'Practice adjective agreement'],
      vocabulary: [
        { spanish: 'la oficina', english: 'office', difficulty: 2, tags: ['workplace'] },
        { spanish: 'la empresa', english: 'company', difficulty: 3, tags: ['workplace'] },
        { spanish: 'el/la colega', english: 'colleague', difficulty: 3, tags: ['workplace'] },
        { spanish: 'el/la jefe/a', english: 'boss', difficulty: 2, tags: ['workplace'] },
        { spanish: 'la reunión', english: 'meeting', difficulty: 3, tags: ['workplace'] },
        { spanish: 'el correo electrónico', english: 'email', difficulty: 2, tags: ['workplace'] },
        { spanish: 'ocupado/a', english: 'busy', difficulty: 2, tags: ['workplace'] }
      ],
      estimatedDuration: 30, difficulty: 3, prerequisites: ['a2-u1-l2']
    },
    // Unit 2: Comida y Compras
    {
      id: 'a2-u2-l1', title: 'En el Restaurante', cefr: 'A2', unit: 2, lesson: 1,
      objectives: ['Order food and drinks', 'Learn direct object pronouns', 'Restaurant vocabulary'],
      vocabulary: [
        { spanish: 'el camarero/la camarera', english: 'waiter/waitress', difficulty: 2, tags: ['restaurant'] },
        { spanish: 'el menú', english: 'menu', difficulty: 1, tags: ['restaurant'] },
        { spanish: 'la cuenta', english: 'bill, check', difficulty: 2, tags: ['restaurant'] },
        { spanish: 'pedir (e>i)', english: 'to order', difficulty: 2, tags: ['restaurant'] },
        { spanish: 'el primer plato', english: 'appetizer', difficulty: 3, tags: ['food'] },
        { spanish: 'el segundo plato', english: 'main course', difficulty: 3, tags: ['food'] },
        { spanish: 'el postre', english: 'dessert', difficulty: 2, tags: ['food'] },
        { spanish: '¡Qué rico!', english: 'How delicious!', difficulty: 2, tags: ['expression'] }
      ],
      estimatedDuration: 35, difficulty: 3, prerequisites: ['a2-u1-l3']
    },
    {
      id: 'a2-u2-l2', title: 'Vamos de Compras', cefr: 'A2', unit: 2, lesson: 2,
      objectives: ['Shop for clothes', 'Use demonstratives', 'Ask for prices'],
      vocabulary: [
        { spanish: 'la tienda', english: 'store', difficulty: 1, tags: ['shopping'] },
        { spanish: 'la ropa', english: 'clothes', difficulty: 2, tags: ['shopping'] },
        { spanish: 'la camiseta', english: 't-shirt', difficulty: 2, tags: ['clothing'] },
        { spanish: 'los pantalones', english: 'pants', difficulty: 2, tags: ['clothing'] },
        { spanish: 'los zapatos', english: 'shoes', difficulty: 2, tags: ['clothing'] },
        { spanish: 'probarse (o>ue)', english: 'to try on', difficulty: 3, tags: ['shopping'] },
        { spanish: '¿Cuánto cuesta?', english: 'How much does it cost?', difficulty: 2, tags: ['expression'] },
        { spanish: 'caro/a', english: 'expensive', difficulty: 2, tags: ['shopping'] },
        { spanish: 'barato/a', english: 'cheap', difficulty: 2, tags: ['shopping'] }
      ],
      estimatedDuration: 40, difficulty: 4, prerequisites: ['a2-u2-l1']
    },
    {
      id: 'a2-u2-l3', title: 'En el Mercado', cefr: 'A2', unit: 2, lesson: 3,
      objectives: ['Buy food at market', 'Use gustar and similar verbs', 'Talk about quantities'],
      vocabulary: [
        { spanish: 'el mercado', english: 'market', difficulty: 2, tags: ['shopping'] },
        { spanish: 'la fruta', english: 'fruit', difficulty: 1, tags: ['food'] },
        { spanish: 'la verdura', english: 'vegetable', difficulty: 2, tags: ['food'] },
        { spanish: 'la manzana', english: 'apple', difficulty: 1, tags: ['fruit'] },
        { spanish: 'el plátano', english: 'banana', difficulty: 1, tags: ['fruit'] },
        { spanish: 'el tomate', english: 'tomato', difficulty: 2, tags: ['vegetable'] },
        { spanish: 'un kilo de...', english: 'a kilo of...', difficulty: 3, tags: ['quantity'] },
        { spanish: 'fresco/a', english: 'fresh', difficulty: 2, tags: ['food'] }
      ],
      estimatedDuration: 35, difficulty: 4, prerequisites: ['a2-u2-l2']
    },
    // Unit 3: El Pasado y la Salud
    {
      id: 'a2-u3-l1', title: '¿Qué Hiciste Ayer?', cefr: 'A2', unit: 3, lesson: 1,
      objectives: ['Talk about past actions', 'Learn regular preterite tense', 'Use time markers'],
      vocabulary: [
        { spanish: 'ayer', english: 'yesterday', difficulty: 1, tags: ['time'] },
        { spanish: 'anoche', english: 'last night', difficulty: 2, tags: ['time'] },
        { spanish: 'la semana pasada', english: 'last week', difficulty: 2, tags: ['time'] },
        { spanish: 'el mes pasado', english: 'last month', difficulty: 2, tags: ['time'] },
        { spanish: 'hace dos días', english: 'two days ago', difficulty: 3, tags: ['time'] },
        { spanish: 'trabajar', english: 'to work', difficulty: 1, tags: ['verb'] },
        { spanish: 'estudiar', english: 'to study', difficulty: 1, tags: ['verb'] }
      ],
      estimatedDuration: 40, difficulty: 4, prerequisites: ['a2-u2-l3']
    },
    {
      id: 'a2-u3-l2', title: 'Un Viaje Inolvidable', cefr: 'A2', unit: 3, lesson: 2,
      objectives: ['Describe memorable trip', 'Learn irregular preterite verbs', 'Travel vocabulary'],
      vocabulary: [
        { spanish: 'el viaje', english: 'trip', difficulty: 2, tags: ['travel'] },
        { spanish: 'las vacaciones', english: 'vacation', difficulty: 2, tags: ['travel'] },
        { spanish: 'el hotel', english: 'hotel', difficulty: 1, tags: ['travel'] },
        { spanish: 'la playa', english: 'beach', difficulty: 2, tags: ['travel'] },
        { spanish: 'la montaña', english: 'mountain', difficulty: 2, tags: ['travel'] },
        { spanish: 'visitar', english: 'to visit', difficulty: 2, tags: ['travel'] },
        { spanish: 'el pasaporte', english: 'passport', difficulty: 3, tags: ['travel'] }
      ],
      estimatedDuration: 40, difficulty: 5, prerequisites: ['a2-u3-l1']
    },
    {
      id: 'a2-u3-l3', title: '¿Cómo te Encuentras?', cefr: 'A2', unit: 3, lesson: 3,
      objectives: ['Talk about health problems', 'Use "doler" for pain', 'Body parts vocabulary'],
      vocabulary: [
        { spanish: 'la cabeza', english: 'head', difficulty: 1, tags: ['body'] },
        { spanish: 'la garganta', english: 'throat', difficulty: 3, tags: ['body'] },
        { spanish: 'el estómago', english: 'stomach', difficulty: 3, tags: ['body'] },
        { spanish: 'el dolor de...', english: 'pain of...', difficulty: 2, tags: ['health'] },
        { spanish: 'tener fiebre', english: 'to have a fever', difficulty: 2, tags: ['health'] },
        { spanish: 'la farmacia', english: 'pharmacy', difficulty: 2, tags: ['health'] },
        { spanish: 'el medicamento', english: 'medication', difficulty: 3, tags: ['health'] }
      ],
      estimatedDuration: 35, difficulty: 4, prerequisites: ['a2-u3-l2']
    }
  ],
  B1: [
    // Unit 1: Sueños y Metas
    {
      id: 'b1-u1-l1', title: 'Planes para el Futuro', cefr: 'B1', unit: 1, lesson: 1,
      objectives: ['Talk about future plans', 'Learn future tense', 'Life goals vocabulary'],
      vocabulary: [
        { spanish: 'el próximo año', english: 'next year', difficulty: 2, tags: ['future'] },
        { spanish: 'la meta', english: 'goal', difficulty: 3, tags: ['life'] },
        { spanish: 'el sueño', english: 'dream', difficulty: 2, tags: ['life'] },
        { spanish: 'graduarse', english: 'to graduate', difficulty: 3, tags: ['life'] },
        { spanish: 'conseguir un trabajo', english: 'to get a job', difficulty: 3, tags: ['life'] },
        { spanish: 'mudarse de casa', english: 'to move house', difficulty: 3, tags: ['life'] },
        { spanish: 'mejorar', english: 'to improve', difficulty: 3, tags: ['life'] },
        { spanish: 'tener éxito', english: 'to be successful', difficulty: 4, tags: ['life'] }
      ],
      estimatedDuration: 45, difficulty: 5, prerequisites: ['a2-u3-l3']
    },
    {
      id: 'b1-u1-l2', title: 'Situaciones Hipotéticas', cefr: 'B1', unit: 1, lesson: 2,
      objectives: ['Discuss hypothetical situations', 'Learn conditional tense', 'Give advice'],
      vocabulary: [
        { spanish: 'si yo fuera tú...', english: 'if I were you...', difficulty: 4, tags: ['advice'] },
        { spanish: 'deberías', english: 'you should', difficulty: 3, tags: ['advice'] },
        { spanish: 'podrías', english: 'you could', difficulty: 3, tags: ['advice'] },
        { spanish: 'recomendar (e>ie)', english: 'to recommend', difficulty: 3, tags: ['advice'] },
        { spanish: 'aconsejar', english: 'to advise', difficulty: 4, tags: ['advice'] },
        { spanish: 'el problema', english: 'problem', difficulty: 2, tags: ['general'] },
        { spanish: 'la solución', english: 'solution', difficulty: 3, tags: ['general'] }
      ],
      estimatedDuration: 40, difficulty: 6, prerequisites: ['b1-u1-l1']
    },
    // Unit 2: Medios y Opiniones
    {
      id: 'b1-u2-l1', title: 'El Mundo Digital', cefr: 'B1', unit: 2, lesson: 1,
      objectives: ['Discuss technology impact', 'Learn por vs. para', 'Technology vocabulary'],
      vocabulary: [
        { spanish: 'el ordenador', english: 'computer', difficulty: 2, tags: ['technology'] },
        { spanish: 'el teléfono móvil', english: 'mobile phone', difficulty: 2, tags: ['technology'] },
        { spanish: 'la red social', english: 'social network', difficulty: 3, tags: ['technology'] },
        { spanish: 'navegar por internet', english: 'to browse internet', difficulty: 3, tags: ['technology'] },
        { spanish: 'descargar', english: 'to download', difficulty: 3, tags: ['technology'] },
        { spanish: 'la aplicación', english: 'app', difficulty: 3, tags: ['technology'] },
        { spanish: 'la ventaja', english: 'advantage', difficulty: 3, tags: ['opinion'] },
        { spanish: 'la desventaja', english: 'disadvantage', difficulty: 3, tags: ['opinion'] }
      ],
      estimatedDuration: 45, difficulty: 6, prerequisites: ['b1-u1-l2']
    },
    {
      id: 'b1-u2-l2', title: 'Dando Opiniones', cefr: 'B1', unit: 2, lesson: 2,
      objectives: ['Express opinions and doubts', 'Introduction to subjunctive', 'Opinion expressions'],
      vocabulary: [
        { spanish: 'creo que', english: 'I think that', difficulty: 2, tags: ['opinion'] },
        { spanish: 'en mi opinión', english: 'in my opinion', difficulty: 3, tags: ['opinion'] },
        { spanish: 'no estoy seguro/a de que', english: 'I\'m not sure that', difficulty: 4, tags: ['doubt'] },
        { spanish: 'es posible que', english: 'it\'s possible that', difficulty: 4, tags: ['doubt'] },
        { spanish: 'me alegro de que', english: 'I\'m happy that', difficulty: 4, tags: ['emotion'] },
        { spanish: 'espero que', english: 'I hope that', difficulty: 3, tags: ['emotion'] },
        { spanish: 'estar de acuerdo', english: 'to agree', difficulty: 3, tags: ['opinion'] }
      ],
      estimatedDuration: 50, difficulty: 7, prerequisites: ['b1-u2-l1']
    },
    // Unit 3: Historias y Tradiciones
    {
      id: 'b1-u3-l1', title: 'Érase una Vez...', cefr: 'B1', unit: 3, lesson: 1,
      objectives: ['Tell stories from past', 'Learn imperfect tense', 'Storytelling vocabulary'],
      vocabulary: [
        { spanish: 'había una vez', english: 'once upon a time', difficulty: 3, tags: ['storytelling'] },
        { spanish: 'de repente', english: 'suddenly', difficulty: 3, tags: ['storytelling'] },
        { spanish: 'mientras', english: 'while', difficulty: 3, tags: ['storytelling'] },
        { spanish: 'frecuentemente', english: 'frequently', difficulty: 3, tags: ['time'] },
        { spanish: 'a menudo', english: 'often', difficulty: 3, tags: ['time'] },
        { spanish: 'el personaje', english: 'character', difficulty: 4, tags: ['storytelling'] },
        { spanish: 'la trama', english: 'plot', difficulty: 5, tags: ['storytelling'] }
      ],
      estimatedDuration: 45, difficulty: 7, prerequisites: ['b1-u2-l2']
    },
    {
      id: 'b1-u3-l2', title: 'Pretérito vs. Imperfecto', cefr: 'B1', unit: 3, lesson: 2,
      objectives: ['Master preterite vs imperfect', 'Narrate complex stories', 'Narrative connectors'],
      vocabulary: [
        { spanish: 'entonces', english: 'then', difficulty: 2, tags: ['connector'] },
        { spanish: 'luego', english: 'then, later', difficulty: 2, tags: ['connector'] },
        { spanish: 'después', english: 'afterwards', difficulty: 2, tags: ['connector'] },
        { spanish: 'al final', english: 'in the end', difficulty: 3, tags: ['connector'] },
        { spanish: 'un día', english: 'one day', difficulty: 1, tags: ['storytelling'] },
        { spanish: 'de pronto', english: 'suddenly', difficulty: 3, tags: ['storytelling'] },
        { spanish: 'por eso', english: 'therefore', difficulty: 3, tags: ['connector'] }
      ],
      estimatedDuration: 50, difficulty: 8, prerequisites: ['b1-u3-l1']
    }
  ],
  B2: [
    // Unit 1: Sociedad y Cultura
    {
      id: 'b2-u1-l1', title: 'Cambios Sociales', cefr: 'B2', unit: 1, lesson: 1,
      objectives: ['Discuss social changes and their impact', 'Use passive voice structures', 'Advanced social vocabulary'],
      vocabulary: [
        { spanish: 'la globalización', english: 'globalization', difficulty: 5, tags: ['society'] },
        { spanish: 'la diversidad', english: 'diversity', difficulty: 4, tags: ['society'] },
        { spanish: 'la desigualdad', english: 'inequality', difficulty: 5, tags: ['society'] },
        { spanish: 'la inmigración', english: 'immigration', difficulty: 4, tags: ['society'] },
        { spanish: 'la integración', english: 'integration', difficulty: 5, tags: ['society'] },
        { spanish: 'el prejuicio', english: 'prejudice', difficulty: 5, tags: ['society'] },
        { spanish: 'la discriminación', english: 'discrimination', difficulty: 5, tags: ['society'] },
        { spanish: 'la tolerancia', english: 'tolerance', difficulty: 4, tags: ['society'] },
        { spanish: 'el multiculturalismo', english: 'multiculturalism', difficulty: 6, tags: ['society'] },
        { spanish: 'ser construido por', english: 'to be built by', difficulty: 4, tags: ['passive'] },
        { spanish: 'ser afectado por', english: 'to be affected by', difficulty: 4, tags: ['passive'] }
      ],
      estimatedDuration: 50, difficulty: 7
    },
    {
      id: 'b2-u1-l2', title: 'Medios de Comunicación', cefr: 'B2', unit: 1, lesson: 2,
      objectives: ['Analyze media influence', 'Practice reported speech', 'Media vocabulary and expressions'],
      vocabulary: [
        { spanish: 'los medios de comunicación', english: 'mass media', difficulty: 4, tags: ['media'] },
        { spanish: 'la prensa', english: 'press', difficulty: 4, tags: ['media'] },
        { spanish: 'el periodismo', english: 'journalism', difficulty: 5, tags: ['media'] },
        { spanish: 'el/la periodista', english: 'journalist', difficulty: 3, tags: ['media'] },
        { spanish: 'la noticia', english: 'news', difficulty: 3, tags: ['media'] },
        { spanish: 'el titular', english: 'headline', difficulty: 4, tags: ['media'] },
        { spanish: 'la objetividad', english: 'objectivity', difficulty: 5, tags: ['media'] },
        { spanish: 'la subjetividad', english: 'subjectivity', difficulty: 5, tags: ['media'] },
        { spanish: 'la manipulación', english: 'manipulation', difficulty: 5, tags: ['media'] },
        { spanish: 'dijo que', english: 'he/she said that', difficulty: 3, tags: ['reported speech'] },
        { spanish: 'afirmó que', english: 'he/she affirmed that', difficulty: 4, tags: ['reported speech'] },
        { spanish: 'según él/ella', english: 'according to him/her', difficulty: 4, tags: ['reported speech'] }
      ],
      estimatedDuration: 55, difficulty: 7, prerequisites: ['b2-u1-l1']
    },
    {
      id: 'b2-u1-l3', title: 'Tradiciones y Modernidad', cefr: 'B2', unit: 1, lesson: 3,
      objectives: ['Compare traditions with modern life', 'Use complex subjunctive forms', 'Cultural analysis vocabulary'],
      vocabulary: [
        { spanish: 'la tradición', english: 'tradition', difficulty: 3, tags: ['culture'] },
        { spanish: 'la modernidad', english: 'modernity', difficulty: 5, tags: ['culture'] },
        { spanish: 'las costumbres', english: 'customs', difficulty: 4, tags: ['culture'] },
        { spanish: 'el patrimonio', english: 'heritage', difficulty: 5, tags: ['culture'] },
        { spanish: 'conservar', english: 'to preserve', difficulty: 4, tags: ['culture'] },
        { spanish: 'preservar', english: 'to preserve', difficulty: 4, tags: ['culture'] },
        { spanish: 'evolucionar', english: 'to evolve', difficulty: 4, tags: ['culture'] },
        { spanish: 'adaptarse', english: 'to adapt', difficulty: 4, tags: ['culture'] },
        { spanish: 'es importante que', english: 'it\'s important that', difficulty: 4, tags: ['subjunctive'] },
        { spanish: 'es necesario que', english: 'it\'s necessary that', difficulty: 4, tags: ['subjunctive'] },
        { spanish: 'me parece bien que', english: 'it seems good to me that', difficulty: 5, tags: ['subjunctive'] }
      ],
      estimatedDuration: 50, difficulty: 8, prerequisites: ['b2-u1-l2']
    },
    // Unit 2: Mundo Profesional
    {
      id: 'b2-u2-l1', title: 'Negociaciones y Reuniones', cefr: 'B2', unit: 2, lesson: 1,
      objectives: ['Participate in professional meetings', 'Learn formal business language', 'Negotiation vocabulary'],
      vocabulary: [
        { spanish: 'la negociación', english: 'negotiation', difficulty: 5, tags: ['business'] },
        { spanish: 'el acuerdo', english: 'agreement', difficulty: 4, tags: ['business'] },
        { spanish: 'el contrato', english: 'contract', difficulty: 4, tags: ['business'] },
        { spanish: 'la propuesta', english: 'proposal', difficulty: 4, tags: ['business'] },
        { spanish: 'el presupuesto', english: 'budget', difficulty: 4, tags: ['business'] },
        { spanish: 'los beneficios', english: 'profits/benefits', difficulty: 4, tags: ['business'] },
        { spanish: 'las pérdidas', english: 'losses', difficulty: 4, tags: ['business'] },
        { spanish: 'el compromiso', english: 'commitment', difficulty: 4, tags: ['business'] },
        { spanish: 'establecer', english: 'to establish', difficulty: 4, tags: ['business'] },
        { spanish: 'proponer', english: 'to propose', difficulty: 3, tags: ['business'] },
        { spanish: 'rechazar', english: 'to reject', difficulty: 4, tags: ['business'] },
        { spanish: 'aceptar', english: 'to accept', difficulty: 3, tags: ['business'] }
      ],
      estimatedDuration: 55, difficulty: 8, prerequisites: ['b2-u1-l3']
    },
    {
      id: 'b2-u2-l2', title: 'Innovación y Emprendimiento', cefr: 'B2', unit: 2, lesson: 2,
      objectives: ['Discuss innovation and entrepreneurship', 'Use conditional perfect', 'Business and technology vocabulary'],
      vocabulary: [
        { spanish: 'la innovación', english: 'innovation', difficulty: 5, tags: ['business'] },
        { spanish: 'el emprendimiento', english: 'entrepreneurship', difficulty: 6, tags: ['business'] },
        { spanish: 'el/la emprendedor(a)', english: 'entrepreneur', difficulty: 5, tags: ['business'] },
        { spanish: 'la startup', english: 'startup', difficulty: 4, tags: ['business'] },
        { spanish: 'la financiación', english: 'financing', difficulty: 5, tags: ['business'] },
        { spanish: 'el inversor', english: 'investor', difficulty: 5, tags: ['business'] },
        { spanish: 'el mercado', english: 'market', difficulty: 3, tags: ['business'] },
        { spanish: 'la competencia', english: 'competition', difficulty: 4, tags: ['business'] },
        { spanish: 'desarrollar', english: 'to develop', difficulty: 3, tags: ['business'] },
        { spanish: 'lanzar', english: 'to launch', difficulty: 4, tags: ['business'] },
        { spanish: 'habría sido', english: 'would have been', difficulty: 5, tags: ['conditional perfect'] },
        { spanish: 'habría hecho', english: 'would have done', difficulty: 5, tags: ['conditional perfect'] }
      ],
      estimatedDuration: 60, difficulty: 8, prerequisites: ['b2-u2-l1']
    },
    // Unit 3: Medio Ambiente y Futuro
    {
      id: 'b2-u3-l1', title: 'Crisis Ambiental', cefr: 'B2', unit: 3, lesson: 1,
      objectives: ['Discuss environmental issues', 'Express concern and solutions', 'Environmental vocabulary'],
      vocabulary: [
        { spanish: 'el medio ambiente', english: 'environment', difficulty: 4, tags: ['environment'] },
        { spanish: 'el cambio climático', english: 'climate change', difficulty: 4, tags: ['environment'] },
        { spanish: 'el calentamiento global', english: 'global warming', difficulty: 5, tags: ['environment'] },
        { spanish: 'la contaminación', english: 'pollution', difficulty: 4, tags: ['environment'] },
        { spanish: 'los recursos naturales', english: 'natural resources', difficulty: 5, tags: ['environment'] },
        { spanish: 'la sostenibilidad', english: 'sustainability', difficulty: 5, tags: ['environment'] },
        { spanish: 'las energías renovables', english: 'renewable energy', difficulty: 5, tags: ['environment'] },
        { spanish: 'la deforestación', english: 'deforestation', difficulty: 5, tags: ['environment'] },
        { spanish: 'la biodiversidad', english: 'biodiversity', difficulty: 6, tags: ['environment'] },
        { spanish: 'reciclar', english: 'to recycle', difficulty: 3, tags: ['environment'] },
        { spanish: 'reducir', english: 'to reduce', difficulty: 3, tags: ['environment'] },
        { spanish: 'conservar', english: 'to conserve', difficulty: 4, tags: ['environment'] }
      ],
      estimatedDuration: 55, difficulty: 8, prerequisites: ['b2-u2-l2']
    },
    {
      id: 'b2-u3-l2', title: 'Tecnología del Futuro', cefr: 'B2', unit: 3, lesson: 2,
      objectives: ['Predict future technological developments', 'Use future perfect and probability', 'Advanced technology vocabulary'],
      vocabulary: [
        { spanish: 'la inteligencia artificial', english: 'artificial intelligence', difficulty: 5, tags: ['technology'] },
        { spanish: 'la robótica', english: 'robotics', difficulty: 5, tags: ['technology'] },
        { spanish: 'la realidad virtual', english: 'virtual reality', difficulty: 5, tags: ['technology'] },
        { spanish: 'la biotecnología', english: 'biotechnology', difficulty: 6, tags: ['technology'] },
        { spanish: 'la nanotecnología', english: 'nanotechnology', difficulty: 6, tags: ['technology'] },
        { spanish: 'los datos', english: 'data', difficulty: 4, tags: ['technology'] },
        { spanish: 'el algoritmo', english: 'algorithm', difficulty: 5, tags: ['technology'] },
        { spanish: 'automatizar', english: 'to automate', difficulty: 5, tags: ['technology'] },
        { spanish: 'digitalizar', english: 'to digitize', difficulty: 5, tags: ['technology'] },
        { spanish: 'habrá cambiado', english: 'will have changed', difficulty: 5, tags: ['future perfect'] },
        { spanish: 'habremos desarrollado', english: 'we will have developed', difficulty: 5, tags: ['future perfect'] },
        { spanish: 'probablemente', english: 'probably', difficulty: 4, tags: ['probability'] }
      ],
      estimatedDuration: 60, difficulty: 9, prerequisites: ['b2-u3-l1']
    },
    {
      id: 'b2-u3-l3', title: 'Sociedad del Siglo XXI', cefr: 'B2', unit: 3, lesson: 3,
      objectives: ['Analyze 21st century social challenges', 'Express complex ideas and solutions', 'Advanced social and philosophical vocabulary'],
      vocabulary: [
        { spanish: 'la sociedad', english: 'society', difficulty: 3, tags: ['society'] },
        { spanish: 'el siglo', english: 'century', difficulty: 3, tags: ['time'] },
        { spanish: 'la era digital', english: 'digital age', difficulty: 4, tags: ['technology'] },
        { spanish: 'la desconexión', english: 'disconnection', difficulty: 5, tags: ['society'] },
        { spanish: 'la soledad', english: 'loneliness', difficulty: 4, tags: ['society'] },
        { spanish: 'la alienación', english: 'alienation', difficulty: 6, tags: ['society'] },
        { spanish: 'la comunidad virtual', english: 'virtual community', difficulty: 5, tags: ['technology'] },
        { spanish: 'la identidad digital', english: 'digital identity', difficulty: 5, tags: ['technology'] },
        { spanish: 'la privacidad', english: 'privacy', difficulty: 4, tags: ['technology'] },
        { spanish: 'la transparencia', english: 'transparency', difficulty: 5, tags: ['society'] },
        { spanish: 'la democracia', english: 'democracy', difficulty: 4, tags: ['politics'] },
        { spanish: 'la participación ciudadana', english: 'citizen participation', difficulty: 5, tags: ['politics'] },
        { spanish: 'es fundamental que', english: 'it\'s fundamental that', difficulty: 5, tags: ['subjunctive'] },
        { spanish: 'sin duda alguna', english: 'without a doubt', difficulty: 4, tags: ['certainty'] }
      ],
      estimatedDuration: 55, difficulty: 9, prerequisites: ['b2-u3-l2']
    }
  ],
  
  // ==================== C1 LEVEL ====================
  // Advanced proficiency: Complex academic/professional discourse
  C1: [
    // Unit 1: Pensamiento Crítico y Argumentación
    {
      id: 'c1-u1-l1', title: 'Análisis y Síntesis de Ideas', cefr: 'C1', unit: 1, lesson: 1,
      objectives: ['Analyze complex academic texts', 'Synthesize multiple viewpoints', 'Advanced discourse markers'],
      vocabulary: [
        { spanish: 'no obstante', english: 'nevertheless', difficulty: 6, tags: ['discourse'] },
        { spanish: 'ahora bien', english: 'now then', difficulty: 6, tags: ['discourse'] },
        { spanish: 'en tanto que', english: 'inasmuch as', difficulty: 7, tags: ['discourse'] },
        { spanish: 'por consiguiente', english: 'consequently', difficulty: 6, tags: ['discourse'] },
        { spanish: 'la perspectiva', english: 'perspective', difficulty: 5, tags: ['analysis'] },
        { spanish: 'el enfoque', english: 'approach', difficulty: 5, tags: ['analysis'] },
        { spanish: 'la tesis', english: 'thesis', difficulty: 5, tags: ['academic'] },
        { spanish: 'la hipótesis', english: 'hypothesis', difficulty: 6, tags: ['academic'] },
        { spanish: 'postular', english: 'to postulate', difficulty: 7, tags: ['academic'] },
        { spanish: 'refutar', english: 'to refute', difficulty: 6, tags: ['academic'] },
        { spanish: 'corroborar', english: 'to corroborate', difficulty: 6, tags: ['academic'] }
      ],
      estimatedDuration: 60, difficulty: 8
    },
    {
      id: 'c1-u1-l2', title: 'Estructuras Argumentativas Complejas', cefr: 'C1', unit: 1, lesson: 2,
      objectives: ['Master complex conditional structures', 'Advanced subjunctive usage', 'Sophisticated argumentation'],
      vocabulary: [
        { spanish: 'fuera cual fuere', english: 'whatever it might be', difficulty: 8, tags: ['concessive'] },
        { spanish: 'sea como sea', english: 'be that as it may', difficulty: 7, tags: ['concessive'] },
        { spanish: 'huelga decir', english: 'needless to say', difficulty: 7, tags: ['discourse'] },
        { spanish: 'cabe mencionar', english: 'it\'s worth mentioning', difficulty: 6, tags: ['discourse'] },
        { spanish: 'es menester', english: 'it is necessary', difficulty: 7, tags: ['formal'] },
        { spanish: 'conforme a', english: 'in accordance with', difficulty: 6, tags: ['formal'] },
        { spanish: 'en virtud de', english: 'by virtue of', difficulty: 7, tags: ['formal'] },
        { spanish: 'a tenor de', english: 'in light of', difficulty: 8, tags: ['formal'] },
        { spanish: 'suponiendo que', english: 'supposing that', difficulty: 6, tags: ['hypothetical'] },
        { spanish: 'dado que', english: 'given that', difficulty: 5, tags: ['causal'] }
      ],
      estimatedDuration: 65, difficulty: 9, prerequisites: ['c1-u1-l1']
    },
    {
      id: 'c1-u1-l3', title: 'Retórica y Persuasión', cefr: 'C1', unit: 1, lesson: 3,
      objectives: ['Analyze rhetorical devices', 'Construct persuasive arguments', 'Register variation mastery'],
      vocabulary: [
        { spanish: 'la retórica', english: 'rhetoric', difficulty: 6, tags: ['language'] },
        { spanish: 'la elocuencia', english: 'eloquence', difficulty: 7, tags: ['language'] },
        { spanish: 'la persuasión', english: 'persuasion', difficulty: 5, tags: ['communication'] },
        { spanish: 'el matiz', english: 'nuance', difficulty: 6, tags: ['language'] },
        { spanish: 'sutil', english: 'subtle', difficulty: 5, tags: ['description'] },
        { spanish: 'solapado', english: 'subtle/sneaky', difficulty: 7, tags: ['description'] },
        { spanish: 'incurrir en', english: 'to incur/fall into', difficulty: 6, tags: ['formal'] },
        { spanish: 'adolecer de', english: 'to suffer from/lack', difficulty: 7, tags: ['formal'] },
        { spanish: 'erigirse en', english: 'to set oneself up as', difficulty: 8, tags: ['formal'] },
        { spanish: 'aderezar', english: 'to season/embellish', difficulty: 7, tags: ['style'] }
      ],
      estimatedDuration: 60, difficulty: 9, prerequisites: ['c1-u1-l2']
    },

    // Unit 2: Cultura y Sociedad Avanzada
    {
      id: 'c1-u2-l1', title: 'Fenómenos Socioculturales', cefr: 'C1', unit: 2, lesson: 1,
      objectives: ['Analyze sociocultural phenomena', 'Advanced cultural competence', 'Sociolinguistic awareness'],
      vocabulary: [
        { spanish: 'el fenómeno', english: 'phenomenon', difficulty: 5, tags: ['academic'] },
        { spanish: 'el paradigma', english: 'paradigm', difficulty: 6, tags: ['academic'] },
        { spanish: 'la idiosincrasia', english: 'idiosyncrasy', difficulty: 7, tags: ['culture'] },
        { spanish: 'el acervo cultural', english: 'cultural heritage', difficulty: 7, tags: ['culture'] },
        { spanish: 'la cosmovisión', english: 'worldview', difficulty: 7, tags: ['philosophy'] },
        { spanish: 'subyacente', english: 'underlying', difficulty: 6, tags: ['analysis'] },
        { spanish: 'intrínseco', english: 'intrinsic', difficulty: 6, tags: ['analysis'] },
        { spanish: 'extrínseco', english: 'extrinsic', difficulty: 7, tags: ['analysis'] },
        { spanish: 'conllevar', english: 'to entail', difficulty: 6, tags: ['consequence'] },
        { spanish: 'estar en el horno', english: 'to be in trouble', difficulty: 6, tags: ['argentinian'] }
      ],
      estimatedDuration: 65, difficulty: 8, prerequisites: ['c1-u1-l3']
    },
    {
      id: 'c1-u2-l2', title: 'Variación Lingüística y Registros', cefr: 'C1', unit: 2, lesson: 2,
      objectives: ['Master register variation', 'Sociolinguistic competence', 'Dialectal awareness'],
      vocabulary: [
        { spanish: 'el registro', english: 'register', difficulty: 6, tags: ['linguistics'] },
        { spanish: 'la variante', english: 'variant', difficulty: 6, tags: ['linguistics'] },
        { spanish: 'el dialecto', english: 'dialect', difficulty: 5, tags: ['linguistics'] },
        { spanish: 'el sociolecto', english: 'sociolect', difficulty: 8, tags: ['linguistics'] },
        { spanish: 'vernáculo', english: 'vernacular', difficulty: 7, tags: ['linguistics'] },
        { spanish: 'coloquial', english: 'colloquial', difficulty: 6, tags: ['linguistics'] },
        { spanish: 'la jerga', english: 'slang/jargon', difficulty: 5, tags: ['linguistics'] },
        { spanish: 'el argot', english: 'slang', difficulty: 6, tags: ['linguistics'] },
        { spanish: 'estar de moda', english: 'to be fashionable', difficulty: 4, tags: ['expression'] },
        { spanish: 'caer en desuso', english: 'to fall into disuse', difficulty: 7, tags: ['formal'] }
      ],
      estimatedDuration: 70, difficulty: 9, prerequisites: ['c1-u2-l1']
    },

    // Unit 3: Expresión Especializada
    {
      id: 'c1-u3-l1', title: 'Lenguaje Académico y Profesional', cefr: 'C1', unit: 3, lesson: 1,
      objectives: ['Master academic discourse', 'Professional communication', 'Specialized terminology'],
      vocabulary: [
        { spanish: 'la metodología', english: 'methodology', difficulty: 6, tags: ['academic'] },
        { spanish: 'la epistemología', english: 'epistemology', difficulty: 8, tags: ['academic'] },
        { spanish: 'axiomático', english: 'axiomatic', difficulty: 8, tags: ['academic'] },
        { spanish: 'paradigmático', english: 'paradigmatic', difficulty: 7, tags: ['academic'] },
        { spanish: 'heurístico', english: 'heuristic', difficulty: 8, tags: ['academic'] },
        { spanish: 'la nomenclatura', english: 'nomenclature', difficulty: 7, tags: ['academic'] },
        { spanish: 'la taxonomía', english: 'taxonomy', difficulty: 7, tags: ['academic'] },
        { spanish: 'desglosar', english: 'to break down', difficulty: 6, tags: ['analysis'] },
        { spanish: 'sistematizar', english: 'to systematize', difficulty: 6, tags: ['analysis'] },
        { spanish: 'conceptualizar', english: 'to conceptualize', difficulty: 7, tags: ['analysis'] }
      ],
      estimatedDuration: 65, difficulty: 9, prerequisites: ['c1-u2-l2']
    },
    {
      id: 'c1-u3-l2', title: 'Estilo y Registro Literario', cefr: 'C1', unit: 3, lesson: 2,
      objectives: ['Analyze literary style', 'Advanced stylistic devices', 'Literary appreciation'],
      vocabulary: [
        { spanish: 'la prosodia', english: 'prosody', difficulty: 8, tags: ['literature'] },
        { spanish: 'la metáfora', english: 'metaphor', difficulty: 5, tags: ['literature'] },
        { spanish: 'la metonimia', english: 'metonymy', difficulty: 7, tags: ['literature'] },
        { spanish: 'la sinécdoque', english: 'synecdoche', difficulty: 8, tags: ['literature'] },
        { spanish: 'la aliteración', english: 'alliteration', difficulty: 7, tags: ['literature'] },
        { spanish: 'la intertextualidad', english: 'intertextuality', difficulty: 8, tags: ['literature'] },
        { spanish: 'el símil', english: 'simile', difficulty: 6, tags: ['literature'] },
        { spanish: 'la hipérbole', english: 'hyperbole', difficulty: 6, tags: ['literature'] },
        { spanish: 'melancólico', english: 'melancholic', difficulty: 6, tags: ['emotion'] },
        { spanish: 'nostálgico', english: 'nostalgic', difficulty: 5, tags: ['emotion'] }
      ],
      estimatedDuration: 70, difficulty: 9, prerequisites: ['c1-u3-l1']
    }
  ],

  // ==================== C2 LEVEL ====================
  // Near-native proficiency: Mastery-level discourse and cultural competence
  C2: [
    // Unit 1: Maestría Lingüística
    {
      id: 'c2-u1-l1', title: 'Precisión Semántica y Lexical', cefr: 'C2', unit: 1, lesson: 1,
      objectives: ['Master semantic precision', 'Lexical sophistication', 'Subtle meaning distinctions'],
      vocabulary: [
        { spanish: 'la precisión', english: 'precision', difficulty: 5, tags: ['language'] },
        { spanish: 'la sutileza', english: 'subtlety', difficulty: 6, tags: ['language'] },
        { spanish: 'la ambigüedad', english: 'ambiguity', difficulty: 6, tags: ['language'] },
        { spanish: 'la polisemia', english: 'polysemy', difficulty: 8, tags: ['linguistics'] },
        { spanish: 'la homonimia', english: 'homonymy', difficulty: 8, tags: ['linguistics'] },
        { spanish: 'la connotación', english: 'connotation', difficulty: 7, tags: ['linguistics'] },
        { spanish: 'la denotación', english: 'denotation', difficulty: 7, tags: ['linguistics'] },
        { spanish: 'matizar', english: 'to qualify/nuance', difficulty: 7, tags: ['expression'] },
        { spanish: 'desdecirse', english: 'to retract', difficulty: 7, tags: ['communication'] },
        { spanish: 'circunloquio', english: 'circumlocution', difficulty: 8, tags: ['style'] }
      ],
      estimatedDuration: 75, difficulty: 9
    },
    {
      id: 'c2-u1-l2', title: 'Estilística Avanzada', cefr: 'C2', unit: 1, lesson: 2,
      objectives: ['Master stylistic variation', 'Aesthetic language use', 'Creative expression'],
      vocabulary: [
        { spanish: 'la estilística', english: 'stylistics', difficulty: 7, tags: ['linguistics'] },
        { spanish: 'la elegancia', english: 'elegance', difficulty: 5, tags: ['style'] },
        { spanish: 'la sofisticación', english: 'sophistication', difficulty: 6, tags: ['style'] },
        { spanish: 'la cadencia', english: 'cadence', difficulty: 7, tags: ['style'] },
        { spanish: 'el ritmo', english: 'rhythm', difficulty: 4, tags: ['style'] },
        { spanish: 'la eufonía', english: 'euphony', difficulty: 8, tags: ['linguistics'] },
        { spanish: 'la cacofonía', english: 'cacophony', difficulty: 8, tags: ['linguistics'] },
        { spanish: 'depurado', english: 'refined', difficulty: 7, tags: ['style'] },
        { spanish: 'pulido', english: 'polished', difficulty: 6, tags: ['style'] },
        { spanish: 'diáfano', english: 'crystal clear', difficulty: 7, tags: ['style'] }
      ],
      estimatedDuration: 80, difficulty: 10, prerequisites: ['c2-u1-l1']
    },

    // Unit 2: Competencia Cultural Profunda
    {
      id: 'c2-u2-l1', title: 'Memoria Cultural y Literatura', cefr: 'C2', unit: 2, lesson: 1,
      objectives: ['Deep cultural analysis', 'Literary interpretation', 'Cultural memory understanding'],
      vocabulary: [
        { spanish: 'la memoria colectiva', english: 'collective memory', difficulty: 7, tags: ['culture'] },
        { spanish: 'el imaginario', english: 'imaginary/mindset', difficulty: 7, tags: ['culture'] },
        { spanish: 'el canon literario', english: 'literary canon', difficulty: 7, tags: ['literature'] },
        { spanish: 'la herméneutica', english: 'hermeneutics', difficulty: 8, tags: ['philosophy'] },
        { spanish: 'la exégesis', english: 'exegesis', difficulty: 8, tags: ['analysis'] },
        { spanish: 'la tradición', english: 'tradition', difficulty: 4, tags: ['culture'] },
        { spanish: 'la ruptura', english: 'rupture/break', difficulty: 6, tags: ['change'] },
        { spanish: 'la continuidad', english: 'continuity', difficulty: 6, tags: ['persistence'] },
        { spanish: 'permear', english: 'to permeate', difficulty: 7, tags: ['influence'] },
        { spanish: 'impregnar', english: 'to impregnate/imbue', difficulty: 6, tags: ['influence'] }
      ],
      estimatedDuration: 85, difficulty: 10, prerequisites: ['c2-u1-l2']
    },
    {
      id: 'c2-u2-l2', title: 'Competencia Sociopragmática', cefr: 'C2', unit: 2, lesson: 2,
      objectives: ['Master sociopragmatic competence', 'Implicit meaning interpretation', 'Cultural scripts'],
      vocabulary: [
        { spanish: 'la pragmática', english: 'pragmatics', difficulty: 7, tags: ['linguistics'] },
        { spanish: 'el sobreentendido', english: 'implication', difficulty: 7, tags: ['communication'] },
        { spanish: 'la implicatura', english: 'implicature', difficulty: 8, tags: ['linguistics'] },
        { spanish: 'la presuposición', english: 'presupposition', difficulty: 7, tags: ['linguistics'] },
        { spanish: 'el eufemismo', english: 'euphemism', difficulty: 6, tags: ['language'] },
        { spanish: 'la litote', english: 'litotes', difficulty: 8, tags: ['rhetoric'] },
        { spanish: 'la ironía', english: 'irony', difficulty: 5, tags: ['rhetoric'] },
        { spanish: 'soterrado', english: 'buried/hidden', difficulty: 7, tags: ['description'] },
        { spanish: 'tácito', english: 'tacit', difficulty: 7, tags: ['communication'] },
        { spanish: 'implícito', english: 'implicit', difficulty: 6, tags: ['communication'] }
      ],
      estimatedDuration: 80, difficulty: 10, prerequisites: ['c2-u2-l1']
    },

    // Unit 3: Excelencia Comunicativa
    {
      id: 'c2-u3-l1', title: 'Comunicación de Alta Complejidad', cefr: 'C2', unit: 3, lesson: 1,
      objectives: ['Master complex communication', 'Expert-level discourse', 'Sophisticated interaction'],
      vocabulary: [
        { spanish: 'la complejidad', english: 'complexity', difficulty: 6, tags: ['description'] },
        { spanish: 'la intrincación', english: 'intricacy', difficulty: 8, tags: ['description'] },
        { spanish: 'la sofisticación', english: 'sophistication', difficulty: 6, tags: ['quality'] },
        { spanish: 'la maestría', english: 'mastery', difficulty: 6, tags: ['skill'] },
        { spanish: 'la destreza', english: 'skill/dexterity', difficulty: 6, tags: ['skill'] },
        { spanish: 'la pericia', english: 'expertise', difficulty: 7, tags: ['skill'] },
        { spanish: 'la virtuosidad', english: 'virtuosity', difficulty: 7, tags: ['skill'] },
        { spanish: 'diestro', english: 'skilled', difficulty: 6, tags: ['description'] },
        { spanish: 'avezado', english: 'experienced', difficulty: 7, tags: ['description'] },
        { spanish: 'consumado', english: 'consummate', difficulty: 7, tags: ['description'] }
      ],
      estimatedDuration: 90, difficulty: 10, prerequisites: ['c2-u2-l2']
    }
  ]
};

// Helper function to generate unique IDs for vocabulary
function generateVocabId(spanish, english) {
  return `vocab_${spanish.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

// Seed lessons
function seedLessons() {
  console.log('Seeding lessons...');
  
  const insertLesson = db.prepare(`
    INSERT OR REPLACE INTO lesson (id, title, cefr, objectives, content_refs)
    VALUES (?, ?, ?, ?, ?)
  `);

  let lessonCount = 0;

  for (const level in curriculum) {
    const lessons = curriculum[level];
    
    for (const lesson of lessons) {
      const objectives = JSON.stringify(lesson.objectives);
      const contentRefs = JSON.stringify({
        unit: lesson.unit,
        lesson: lesson.lesson,
        prerequisites: lesson.prerequisites || [],
        difficulty: lesson.difficulty,
        estimatedDuration: lesson.estimatedDuration,
        vocabularyCount: lesson.vocabulary.length
      });

      insertLesson.run(
        lesson.id,
        lesson.title,
        lesson.cefr,
        objectives,
        contentRefs
      );

      lessonCount++;
    }
  }

  console.log(`✅ Seeded ${lessonCount} lessons`);
}

// Seed vocabulary
function seedVocabulary() {
  console.log('Seeding vocabulary...');
  
  const insertVocab = db.prepare(`
    INSERT OR REPLACE INTO vocab (id, spanish, english, tags)
    VALUES (?, ?, ?, ?)
  `);

  let vocabCount = 0;
  const seenWords = new Set();

  for (const level in curriculum) {
    const lessons = curriculum[level];
    
    for (const lesson of lessons) {
      for (const vocabItem of lesson.vocabulary) {
        const wordKey = `${vocabItem.spanish}-${vocabItem.english}`;
        
        if (!seenWords.has(wordKey)) {
          const id = generateVocabId(vocabItem.spanish, vocabItem.english);
          const tags = JSON.stringify({
            difficulty: vocabItem.difficulty,
            tags: vocabItem.tags,
            lesson: lesson.id,
            cefr: lesson.cefr
          });

          insertVocab.run(
            id,
            vocabItem.spanish,
            vocabItem.english,
            tags
          );

          seenWords.add(wordKey);
          vocabCount++;
        }
      }
    }
  }

  console.log(`✅ Seeded ${vocabCount} vocabulary items`);
}

// Main seeding function
function seedCurriculum() {
  console.log('🌱 Starting comprehensive curriculum seeding...');
  
  try {
    db.exec('BEGIN TRANSACTION');
    
    // Clear existing data
    db.exec('DELETE FROM lesson');
    db.exec('DELETE FROM vocab');
    console.log('Cleared existing curriculum data');
    
    seedLessons();
    seedVocabulary();
    
    db.exec('COMMIT');
    
    console.log('✅ Comprehensive curriculum seeding completed!');
    
    // Display statistics
    const lessonCount = db.prepare('SELECT COUNT(*) as count FROM lesson').get().count;
    const vocabCount = db.prepare('SELECT COUNT(*) as count FROM vocab').get().count;
    
    console.log(`📊 Database now contains:`);
    console.log(`   - ${lessonCount} lessons (school-level standard)`);
    console.log(`   - ${vocabCount} vocabulary items`);
    console.log(`   - 3 units per level (A1, A2, B1, B2, C1, C2)`);
    console.log(`   - Progressive difficulty scaling (1-10)`);
    console.log(`   - A1: ${curriculum.A1.length} lessons (beginner)`);
    console.log(`   - A2: ${curriculum.A2.length} lessons (elementary)`);
    console.log(`   - B1: ${curriculum.B1.length} lessons (intermediate)`);
    console.log(`   - B2: ${curriculum.B2.length} lessons (upper-intermediate)`);
    console.log(`   - C1: ${curriculum.C1.length} lessons (advanced)`);
    console.log(`   - C2: ${curriculum.C2.length} lessons (near-native)`);
    
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('❌ Error seeding curriculum:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the seeding
if (require.main === module) {
  seedCurriculum();
}

module.exports = { seedCurriculum };