import {
  EmotionOption,
  PauseStyleId,
  PronunciationEntry,
  RegionalVariantId,
  SpeedPresetId,
  StyleOption,
  VoiceOption,
} from "../types";

export const VOICES: VoiceOption[] = [
  {
    id: "Kore",
    name: "Kore",
    gender: "female",
    label: "Kore (Femenina · Cálida)",
    sampleLine: "Hola, soy Kore. Mi voz es cálida, clara y natural para tus narraciones.",
  },
  {
    id: "Zephyr",
    name: "Zephyr",
    gender: "female",
    label: "Zephyr (Femenina · Ágil)",
    sampleLine: "Hola, soy Zephyr. Tengo una voz fresca y expresiva para historias y videos cortos.",
  },
  {
    id: "Aoede",
    name: "Aoede",
    gender: "female",
    label: "Aoede (Femenina · Serena)",
    sampleLine: "Hola, soy Aoede. Ofrezco una locución serena y elegante para documentales.",
  },
  {
    id: "Leda",
    name: "Leda",
    gender: "female",
    label: "Leda (Femenina · Suave)",
    sampleLine: "Hola, soy Leda. Mi tono suave y cercano es ideal para cuentos y relatos emotivos.",
  },
  {
    id: "Fenrir",
    name: "Fenrir",
    gender: "male",
    label: "Fenrir (Masculina · Firme)",
    sampleLine: "Hola, soy Fenrir. Narro con firmeza y claridad temas educativos y técnicos.",
  },
  {
    id: "Puck",
    name: "Puck",
    gender: "male",
    label: "Puck (Masculina · Juvenil)",
    sampleLine: "Hola, soy Puck. Aporto energía juvenil y naturalidad a diálogos y explicaciones.",
  },
  {
    id: "Charon",
    name: "Charon",
    gender: "male",
    label: "Charon (Masculina · Grave)",
    sampleLine: "Hola, soy Charon. Mi timbre profundo funciona muy bien en escenas de cine y suspenso.",
  },
  {
    id: "Orus",
    name: "Orus",
    gender: "male",
    label: "Orus (Masculina · Intensa)",
    sampleLine: "Hola, soy Orus. Tengo una voz con carácter para momentos intensos y decisivos.",
  },
];

export const STYLES: StyleOption[] = [
  {
    id: "narrador_calido",
    name: "Narrador cálido",
    cue: "narrador cálido, humano y cercano, sin tono de anuncio comercial",
  },
  {
    id: "cinematografico",
    name: "Cinematográfico",
    cue: "narrador cinematográfico pausado y evocador, con presencia serena",
  },
  {
    id: "educativo",
    name: "Educativo",
    cue: "explicación educativa clara, paciente y amigable",
  },
  {
    id: "infantil",
    name: "Infantil / Cuento",
    cue: "cuentacuentos cálido, expresivo y lleno de asombro para historias infantiles",
  },
  {
    id: "serio",
    name: "Serio y profesional",
    cue: "voz sobria, firme y profesional con dicción impecable",
  },
  {
    id: "alegre",
    name: "Alegre",
    cue: "voz alegre, luminosa y natural, sin exageraciones artificiales",
  },
  {
    id: "suspenso",
    name: "Suspenso",
    cue: "voz contenida de suspenso con tensión controlada y pausas cuidadas",
  },
  {
    id: "documental",
    name: "Documental",
    cue: "narrador documental equilibrado, sereno y creíble",
  },
  {
    id: "conversacional",
    name: "Conversacional",
    cue: "habla cotidiana espontánea y natural, como una conversación real",
  },
  {
    id: "tecnico",
    name: "Técnico y preciso",
    cue: "instructor técnico preciso y claro con pronunciación exacta de cifras y términos",
  },
];

export const SPEED_PRESETS: Array<{ id: SpeedPresetId; name: string; cue: string; wpm: number }> = [
  { id: "slow", name: "Lenta", cue: "ritmo pausado y tranquilo", wpm: 118 },
  { id: "normal", name: "Normal", cue: "ritmo natural de conversación", wpm: 138 },
  { id: "fast", name: "Rápida", cue: "ritmo ágil y dinámico manteniendo claridad", wpm: 162 },
];

export const EMOTIONS: EmotionOption[] = [
  { id: "neutral_calido", name: "Natural", cue: "naturalidad equilibrada" },
  { id: "confianza", name: "Confianza", cue: "seguridad y cercanía" },
  { id: "alegria", name: "Alegría", cue: "alegría genuina sin gritar" },
  { id: "curiosidad", name: "Curiosidad", cue: "curiosidad e interés auténtico" },
  { id: "asombro", name: "Asombro", cue: "asombro suave ante un descubrimiento" },
  { id: "ternura", name: "Ternura", cue: "ternura y suavidad afectuosa" },
  { id: "suspenso", name: "Suspenso", cue: "tensión contenida y expectante" },
  { id: "urgencia", name: "Urgencia", cue: "urgencia enfocada sin pánico" },
  { id: "serenidad", name: "Serenidad", cue: "calma profunda y reposada" },
  { id: "tristeza", name: "Tristeza", cue: "melancolía suave y contenida" },
  { id: "humor", name: "Humor suave", cue: "toque ligero de humor natural" },
];

export const PAUSE_OPTIONS: Array<{ id: PauseStyleId; name: string; cue: string }> = [
  { id: "natural", name: "Naturales por idea", cue: "pausas naturales respetando la puntuación" },
  { id: "conversacional", name: "Conversacionales", cue: "pausas breves y orgánicas de diálogo" },
  { id: "dramatica", name: "Dramáticas", cue: "pausas intencionales antes de giros importantes" },
  { id: "pausada", name: "Muy pausadas", cue: "pausas amplias y relajadas entre frases" },
];

export const REGIONAL_OPTIONS: Array<{ id: RegionalVariantId; name: string; cue: string }> = [
  {
    id: "es_latam_sv",
    name: "Español Latinoamericano Neutro (El Salvador)",
    cue: "español latinoamericano neutro claro para El Salvador y Latinoamérica, sin acento peninsular",
  },
  {
    id: "es_latam_neutro",
    name: "Español Latinoamericano Estándar",
    cue: "español latinoamericano neutro de doblaje",
  },
  { id: "es_mx", name: "Español de México", cue: "español de México neutro y natural" },
  { id: "es_co", name: "Español de Colombia", cue: "español de Colombia neutro y claro" },
  { id: "es_ar", name: "Español Rioplatense", cue: "español rioplatense moderado y natural" },
  { id: "es_es", name: "Español de España", cue: "español de España estándar" },
];

export const DEFAULT_GLOSSARY: PronunciationEntry[] = [
  { id: "g1", term: "kWh", spokenForm: "kilovatios hora" },
  { id: "g2", term: "Hz", spokenForm: "hercios" },
  { id: "g3", term: "120 V", spokenForm: "ciento veinte voltios" },
  { id: "g4", term: "20 A", spokenForm: "veinte amperios" },
  { id: "g5", term: "GFCI", spokenForm: "ge efe ce i" },
  { id: "g6", term: "EPP", spokenForm: "e pe pe" },
  { id: "g7", term: "NEC", spokenForm: "ene e ce" },
];

export const QUICK_EXAMPLES = [
  {
    label: "Educativo (Circuito eléctrico)",
    mode: "narration" as const,
    styleId: "educativo" as const,
    voiceId: "Fenrir",
    text: "¿Alguna vez te has preguntado qué ocurre dentro de la pared cuando presionas un interruptor? Un circuito eléctrico funciona como un camino cerrado por donde viaja la energía. Cuando cierras el interruptor, la corriente fluye por el conductor de cobre y transforma la energía eléctrica en luz.",
  },
  {
    label: "Cuento infantil",
    mode: "narration" as const,
    styleId: "infantil" as const,
    voiceId: "Kore",
    text: "Al caer la tarde, Sofía notó un pequeño destello dorado entre las raíces del viejo árbol de mango. Se agachó despacio, apartó dos hojas secas y descubrió una diminuta linterna rodeada de luciérnagas. Sonrió feliz: había encontrado el secreto más mágico del jardín.",
  },
  {
    label: "Suspenso cinematográfico",
    mode: "narration" as const,
    styleId: "suspenso" as const,
    voiceId: "Charon",
    text: "El pasillo de la subestación quedó en completo silencio. De pronto, el indicador rojo comenzó a parpadear. Tenían menos de diez segundos para cortar la línea auxiliar antes de que la sobrecarga alcanzara el núcleo.",
  },
  {
    label: "Diálogo (Elena y Mateo)",
    mode: "dialogue" as const,
    styleId: "conversacional" as const,
    voiceId: "Kore",
    text: `Elena: Mateo, ¿ya revisaste por qué el motor del robot se detiene al girar a la izquierda?
Mateo: Sí, la batería tiene carga completa. El problema estaba en la resistencia del sensor, la conectamos al revés.
Elena: Con razón frenaba en seco. Cambiémosla ahora y hagamos la prueba en la pista.`,
  },
];
