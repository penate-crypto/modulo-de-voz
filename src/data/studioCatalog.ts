import {
  ProductionMode,
  VocalStyleOption,
  EmotionOption,
  VoiceModel,
  RegionalVariant,
  PronunciationEntry,
  StudioTemplate,
} from "../types";

export const PRODUCTION_MODES: ProductionMode[] = [
  {
    id: "modo_a_natural",
    code: "Modo A",
    name: "Narración Natural",
    summary: "Explicaciones, tutoriales, relatos informativos y narraciones cotidianas con fluidez orgánica.",
    useCases: "Tutoriales, videos informativos, ensayos visuales, reseñas",
    defaultStyle: "narrador_calido",
    defaultEmotion: "confianza",
    defaultIntensity: "sutil",
    defaultPauseStyle: "natural_ideas",
    defaultSpeed: 1.0,
    defaultEngine: "gemini-3.8-flash-tts",
    prefersScenes: false,
    prefersMultiSpeaker: false,
    directionPrompt:
      "Deliver a genuinely human, grounded, natural narration for an informational video. Avoid commercial announcer cadence, avoid mechanical rhythm, vary intonation naturally across ideas, and end sentences with relaxed, authentic vocal drops.",
  },
  {
    id: "modo_b_cinematografico",
    code: "Modo B",
    name: "Cinematográfico",
    summary: "Historias inmersivas, documentales, intros dramáticas y escenas emotivas con ritmo de cine.",
    useCases: "Documentales, cortometrajes, relatos históricos, intros épicas",
    defaultStyle: "narrador_cinematografico",
    defaultEmotion: "suspenso",
    defaultIntensity: "moderada",
    defaultPauseStyle: "dramatica",
    defaultSpeed: 0.95,
    defaultEngine: "gemini-3.8-flash-tts",
    prefersScenes: true,
    prefersMultiSpeaker: false,
    directionPrompt:
      "Perform as a seasoned cinema and documentary voice narrator. Use measured phrasing, expressive pauses before revelations, controlled emotional gravitas, and intimate vocal presence without theatrical overacting or shouting.",
  },
  {
    id: "modo_c_cuentos",
    code: "Modo C",
    name: "Cuentos y Animación",
    summary: "Cuentos infantiles educativos, personajes expresivos, aventura y calidez imaginativa.",
    useCases: "Cuentos infantiles, videos animados con IA, fábulas educativas",
    defaultStyle: "personaje_animado",
    defaultEmotion: "curiosidad",
    defaultIntensity: "moderada",
    defaultPauseStyle: "emocional",
    defaultSpeed: 0.98,
    defaultEngine: "gemini-3.8-flash-tts",
    prefersScenes: true,
    prefersMultiSpeaker: true,
    directionPrompt:
      "Perform as a warm, imaginative Latin American children's storyteller and animation voice actor. Convey genuine wonder, tenderness, and playful curiosity with clear articulation and natural emotional transitions, avoiding artificial cartoon screaming.",
  },
  {
    id: "modo_d_educativo",
    code: "Modo D",
    name: "Educativo y Técnico",
    summary: "Enseñanza clara sobre electricidad, ciencia, tecnología y seguridad con precisión terminológica.",
    useCases: "Electricidad, ciencia, ingeniería, capacitación y seguridad",
    defaultStyle: "voz_educativa",
    defaultEmotion: "confianza",
    defaultIntensity: "moderada",
    defaultPauseStyle: "natural_ideas",
    defaultSpeed: 0.98,
    defaultEngine: "gemini-3.8-flash-tts",
    prefersScenes: true,
    prefersMultiSpeaker: false,
    directionPrompt:
      "Speak as an approachable, knowledgeable Latin American educator and technical instructor. Prioritize crystal-clear diction of technical terms, numbers, and safety steps, with warm conversational cadence that keeps learners engaged.",
  },
  {
    id: "modo_e_dialogos",
    code: "Modo E",
    name: "Personajes y Diálogos",
    summary: "Conversaciones entre dos o más personajes con voces consistentes e intenciones propias.",
    useCases: "Escenas animadas, entrevistas dramatizadas, diálogos educativos",
    defaultStyle: "conversacion_cotidiana",
    defaultEmotion: "curiosidad",
    defaultIntensity: "moderada",
    defaultPauseStyle: "conversacional",
    defaultSpeed: 1.0,
    defaultEngine: "gemini-3.8-flash-tts",
    prefersScenes: true,
    prefersMultiSpeaker: true,
    directionPrompt:
      "Act as natural conversational dialogue performers interacting in real time. Each character must maintain vocal identity, react genuinely to the other speaker's lines, and keep organic turn-taking cadence.",
  },
  {
    id: "modo_f_emocional",
    code: "Modo F",
    name: "Interpretación Emocional",
    summary: "Progresión emocional gradual por fragmentos: de la curiosidad al suspenso, alivio o calidez.",
    useCases: "Relatos personales, narrativa dramática, arcos emocionales",
    defaultStyle: "voz_emotiva",
    defaultEmotion: "ternura",
    defaultIntensity: "moderada",
    defaultPauseStyle: "emocional",
    defaultSpeed: 0.95,
    defaultEngine: "gemini-3.8-flash-tts",
    prefersScenes: true,
    prefersMultiSpeaker: false,
    directionPrompt:
      "Deliver nuanced emotional acting with gradual transitions between beats. Let emotion shape pacing, breath, and inflection subtly rather than increasing loudness. Preserve full intelligibility at every emotional turn.",
  },
  {
    id: "modo_g_video_corto",
    code: "Modo G",
    name: "Video Corto (Reels / Shorts)",
    summary: "Narración ágil para clips breves de YouTube Shorts, TikTok o Reels sin caer en tono publicitario.",
    useCases: "YouTube Shorts, TikTok, Reels educativos o narrativos",
    defaultStyle: "voz_juvenil",
    defaultEmotion: "entusiasmo",
    defaultIntensity: "moderada",
    defaultPauseStyle: "conversacional",
    defaultSpeed: 1.05,
    defaultEngine: "gemini-3.8-flash-tts",
    prefersScenes: false,
    prefersMultiSpeaker: false,
    directionPrompt:
      "Speak with crisp, engaging modern creator energy suitable for short-form vertical video. Start with a compelling natural hook, keep tight conversational momentum, and avoid sounding like a radio commercial or infomercial.",
  },
  {
    id: "modo_h_escenas",
    code: "Modo H",
    name: "Producción por Escenas",
    summary: "Divide el guion en clips independientes numerados para montar escena por escena en edición de video.",
    useCases: "Videos largos con IA (Veo/Runway/Kling), guiones por toma",
    defaultStyle: "narrador_documental",
    defaultEmotion: "serenidad",
    defaultIntensity: "sutil",
    defaultPauseStyle: "escena_video",
    defaultSpeed: 1.0,
    defaultEngine: "gemini-3.8-flash-tts",
    prefersScenes: true,
    prefersMultiSpeaker: false,
    directionPrompt:
      "Deliver clean, broadcast-ready scene narration designed to align with visual video cuts. Maintain consistent vocal timbre, clean beginnings and endings without clipped words, and steady narrative continuity across scenes.",
  },
];

export const VOCAL_STYLES: VocalStyleOption[] = [
  {
    id: "narrador_cinematografico",
    name: "Narrador cinematográfico",
    description: "Presencia profunda, cadencia pausada y atmósfera narrativa de cine.",
    directionCue: "Cinematic narrator voice with resonant depth, evocative phrasing, and restrained dramatic presence",
    recommendedVoice: "Charon",
  },
  {
    id: "narrador_calido",
    name: "Narrador cálido y cercano",
    description: "Tono humano, empático y natural que genera cercanía inmediata.",
    directionCue: "Warm, intimate, approachable storyteller speaking naturally to a close listener",
    recommendedVoice: "Kore",
  },
  {
    id: "narrador_documental",
    name: "Narrador documental",
    description: "Dicción equilibrada, serena y observacional para documentales y ciencia.",
    directionCue: "Refined documentary narrator: articulate, observant, steady, and deeply credible",
    recommendedVoice: "Fenrir",
  },
  {
    id: "voz_educativa",
    name: "Voz educativa y didáctica",
    description: "Explicación clara, paciente y bien estructurada para facilitar el aprendizaje.",
    directionCue: "Clear, patient, engaging educator voice explaining concepts step by step with natural curiosity",
    recommendedVoice: "Kore",
  },
  {
    id: "voz_juvenil",
    name: "Voz juvenil y enérgica",
    description: "Fresca, ágil y contemporánea para divulgación moderna y videos cortos.",
    directionCue: "Fresh, lively, youthful narrator with authentic enthusiasm and modern conversational flow",
    recommendedVoice: "Puck",
  },
  {
    id: "voz_infantil_estilizada",
    name: "Voz infantil estilizada",
    description: "Dirección juguetona y ligera orientada a cuentos (sujeta al timbre real de la voz base).",
    directionCue: "Playful, light, youthful storybook character interpretation with gentle wonder and bright articulation",
    recommendedVoice: "Zephyr",
    limitationNote: "Dirección interpretativa aplicada a una voz adulta disponible; el modelo no incluye timbres infantiles reales.",
  },
  {
    id: "personaje_animado",
    name: "Personaje animado expresivo",
    description: "Interpretación ágil y gestual para personajes de animación sin caricaturizar en exceso.",
    directionCue: "Expressive animated character voice actor with vivid emotional color, agility, and clear diction",
    recommendedVoice: "Puck",
  },
  {
    id: "voz_misteriosa",
    name: "Voz misteriosa",
    description: "Enigmática, contenida y sugerente para incógnitas y descubrimientos.",
    directionCue: "Intriguing, slightly hushed, mysterious tone inviting the listener into an unanswered question",
    recommendedVoice: "Charon",
  },
  {
    id: "voz_suspenso",
    name: "Voz de suspenso",
    description: "Tensión controlada, ritmo atento y pausas estratégicas ante el peligro.",
    directionCue: "Controlled suspenseful delivery: alert pacing, restrained tension, careful pauses before key turns",
    recommendedVoice: "Orus",
  },
  {
    id: "voz_emotiva",
    name: "Voz emotiva",
    description: "Sensibilidad genuina, inflexiones suaves y conexión emocional honesta.",
    directionCue: "Heartfelt, emotionally vulnerable and sincere delivery with soft natural phrasing",
    recommendedVoice: "Leda",
  },
  {
    id: "voz_alegre",
    name: "Voz alegre y divertida",
    description: "Sonrisa vocal natural, optimismo y chispa ligera sin exageración artificial.",
    directionCue: "Cheerful, lighthearted, smiling voice with genuine warmth and effortless playful rhythm",
    recommendedVoice: "Zephyr",
  },
  {
    id: "voz_seria_profesional",
    name: "Voz seria y profesional",
    description: "Sobria, firme y precisa para comunicados institucionales o reportes formales.",
    directionCue: "Composed, authoritative, professional voice with steady diction and dignified clarity",
    recommendedVoice: "Aoede",
  },
  {
    id: "voz_epica",
    name: "Voz épica",
    description: "Solemnidad y amplitud vocal para momentos decisivos e hitos narrativos.",
    directionCue: "Grand, solemn, resolute epic storytelling voice with deliberate weight on pivotal moments",
    recommendedVoice: "Orus",
  },
  {
    id: "voz_tranquila_reflexiva",
    name: "Voz tranquila y reflexiva",
    description: "Pausada, serena e introspectiva para ensayos, cierres y reflexiones.",
    directionCue: "Calm, thoughtful, unhurried reflective voice with soft endings and peaceful cadence",
    recommendedVoice: "Leda",
  },
  {
    id: "conversacion_cotidiana",
    name: "Conversación cotidiana",
    description: "Naturalidad coloquial limpia, como hablar cara a cara con alguien de confianza.",
    directionCue: "Natural everyday spoken dialogue, completely unscripted feel, relaxed and authentic",
    recommendedVoice: "Kore",
  },
  {
    id: "narracion_tecnica",
    name: "Narración técnica",
    description: "Exactitud en cifras, siglas, seguridad eléctrica y procesos paso a paso.",
    directionCue: "Precise technical instructor voice: immaculate pronunciation of units, tools, and safety protocols with steady rhythm",
    recommendedVoice: "Fenrir",
  },
  {
    id: "interpretacion_dramatica",
    name: "Interpretación dramática",
    description: "Actuación intensa pero creíble para conflictos, giros y momentos clave.",
    directionCue: "Grounded dramatic acting performance with authentic emotional weight and dynamic phrasing",
    recommendedVoice: "Aoede",
  },
  {
    id: "cuento_dormir",
    name: "Voz de cuento antes de dormir",
    description: "Suave, arrulladora y serena para relatos nocturnos infantiles.",
    directionCue: "Gentle, soothing bedtime storyteller voice: unhurried tempo, tender softness, comforting cadence",
    recommendedVoice: "Leda",
  },
];

export const EMOTIONS: EmotionOption[] = [
  { id: "alegria", name: "Alegría", nuanceCue: "warm vocal smile and buoyant rhythm without shouting" },
  { id: "curiosidad", name: "Curiosidad", nuanceCue: "inquisitive, open phrasing with gentle upward interest on discoveries" },
  { id: "asombro", name: "Asombro", nuanceCue: "quiet wonder and authentic awe, slight slowdown on surprising reveals" },
  { id: "entusiasmo", name: "Entusiasmo", nuanceCue: "engaged, lively forward energy without sounding like a commercial ad" },
  { id: "ternura", name: "Ternura", nuanceCue: "soft, affectionate, comforting warmth and delicate pacing" },
  { id: "tristeza", name: "Tristeza", nuanceCue: "subdued, gentle heaviness with unhurried phrasing and soft sentence endings" },
  { id: "preocupacion", name: "Preocupación", nuanceCue: "careful, earnest tone showing genuine concern and caution" },
  { id: "miedo", name: "Miedo", nuanceCue: "restrained vulnerability, tighter breath control, cautious pauses — never cartoonish screaming" },
  { id: "suspenso", name: "Suspenso", nuanceCue: "taut, watchful stillness with deliberate micro-pauses before revelations" },
  { id: "serenidad", name: "Serenidad", nuanceCue: "calm, balanced, unhurried steadiness that inspires peace" },
  { id: "confianza", name: "Confianza", nuanceCue: "grounded, reassuring clarity with firm natural articulation" },
  { id: "urgencia", name: "Urgencia", nuanceCue: "focused alertness and brisk purposeful phrasing without panic or harsh loudness" },
  { id: "determinacion", name: "Determinación", nuanceCue: "resolute, firm conviction with clear deliberate weight on key verbs" },
  { id: "humor", name: "Humor", nuanceCue: "light comic timing, subtle wink in delivery, natural conversational amusement" },
  { id: "ironia_suave", name: "Ironía suave", nuanceCue: "dry, understated playful inflection with subtle knowing timing" },
  { id: "misterio", name: "Misterio", nuanceCue: "hushed, enigmatic intrigue drawing the listener closer" },
  { id: "orgullo", name: "Orgullo", nuanceCue: "dignified satisfaction and warm uplift in tone" },
  { id: "alivio", name: "Alivio", nuanceCue: "releasing tension with a gentle exhale of reassurance and calm resolution" },
];

export const PAUSE_STYLES = [
  {
    id: "natural_ideas" as const,
    name: "Pausas naturales por idea",
    desc: "Respeta la puntuación y separa conceptos sin cortar el flujo.",
    cue: "natural phrasing pauses between complete ideas, never pausing mechanically between words",
  },
  {
    id: "conversacional" as const,
    name: "Ritmo conversacional",
    desc: "Cadencia espontánea con micro-pausas orgánicas propias del habla real.",
    cue: "organic conversational rhythm with subtle natural breath pauses",
  },
  {
    id: "dramatica" as const,
    name: "Pausas dramáticas",
    desc: "Silencios breves con intención antes de giros o escenas de tensión.",
    cue: "intentional dramatic beats before pivotal turns without excessive dead air",
  },
  {
    id: "emocional" as const,
    name: "Pausas emocionales",
    desc: "Respiración narrativa suave para dejar asentar momentos emotivos o tiernos.",
    cue: "gentle emotional breathing space after heartfelt phrases",
  },
  {
    id: "revelacion" as const,
    name: "Pausa antes de revelación",
    desc: "Anticipación breve para destacar datos clave, descubrimientos o conclusiones.",
    cue: "brief anticipatory pause immediately before key revelations or conclusions",
  },
  {
    id: "escena_video" as const,
    name: "Separación para corte de video",
    desc: "Cierres limpios entre clips para facilitar el montaje con escenas visuales.",
    cue: "clean, unhurried sentence endings ideal for video scene transitions",
  },
];

export const VOICE_MODELS: VoiceModel[] = [
  {
    id: "Kore",
    name: "Kore",
    gender: "female",
    register: "Media · Cálida y clara",
    description: "Voz femenina equilibrada, muy natural en español latinoamericano; excelente articulación en narraciones y diálogos.",
    idealFor: "Educativo, cuentos, narración cercana, diálogos",
    isCore38: true,
  },
  {
    id: "Zephyr",
    name: "Zephyr",
    gender: "female",
    register: "Aguda-media · Luminosa y ágil",
    description: "Voz femenina fresca y expresiva con gran movilidad emocional para personajes jóvenes y relatos dinámicos.",
    idealFor: "Cuentos infantiles, animación, video corto",
    isCore38: true,
  },
  {
    id: "Puck",
    name: "Puck",
    gender: "male",
    register: "Media-aguda · Juvenil y expresiva",
    description: "Voz masculina ágil, curiosa y versátil; responde muy bien a cambios emocionales y diálogos animados.",
    idealFor: "Personajes animados, divulgación juvenil, diálogos",
    isCore38: true,
  },
  {
    id: "Fenrir",
    name: "Fenrir",
    gender: "male",
    register: "Media-grave · Firme y documental",
    description: "Voz masculina con aplomo y dicción limpia; sobresale en explicaciones técnicas, seguridad y documentales.",
    idealFor: "Documental, narración técnica, educativo",
    isCore38: true,
  },
  {
    id: "Charon",
    name: "Charon",
    gender: "male",
    register: "Grave · Cinematográfica y sobria",
    description: "Timbre masculino profundo y reflexivo, ideal para suspenso, misterio y narrativa cinematográfica.",
    idealFor: "Cinematográfico, suspenso, misterio, épico",
    isCore38: true,
  },
  {
    id: "Aoede",
    name: "Aoede",
    gender: "female",
    register: "Media · Sobria y narrativa",
    description: "Voz femenina serena y elegante con excelente control de pausas para documentales y drama contenido.",
    idealFor: "Documental, institucional, interpretación dramática",
    isCore38: false,
  },
  {
    id: "Leda",
    name: "Leda",
    gender: "female",
    register: "Suave · Íntima y reflexiva",
    description: "Voz femenina dulce y calmada para cuentos nocturnos, relatos emotivos y reflexiones tranquilas.",
    idealFor: "Cuentos antes de dormir, voz emotiva, ternura",
    isCore38: false,
  },
  {
    id: "Orus",
    name: "Orus",
    gender: "male",
    register: "Grave-firme · Intensa y resolutiva",
    description: "Voz masculina con carácter marcado para escenas de tensión, liderazgo o narraciones épicas.",
    idealFor: "Épico, suspenso, escenas de peligro",
    isCore38: false,
  },
];

export const REGIONAL_VARIANTS: RegionalVariant[] = [
  {
    id: "es_latam_sv",
    name: "Español Latinoamericano Neutro (El Salvador / Centroamérica)",
    description: "Pronunciación clara, natural y comprensible en El Salvador y toda Latinoamérica, sin acento peninsular ni modismos forzados.",
    directionCue:
      "Neutral Latin American Spanish suitable for El Salvador and general Latin American audiences: clear seseo, natural pronunciation without exaggerated regionalisms and strictly without Peninsular Spanish (Castilian) accent",
  },
  {
    id: "es_latam_neutro",
    name: "Español Latinoamericano Estándar (Doblaje)",
    description: "Estándar internacional de doblaje audiovisual latinoamericano.",
    directionCue:
      "Standard neutral Latin American Spanish broadcast/dubbing pronunciation, universally clear across Latin America",
  },
  {
    id: "es_mx",
    name: "Español de México (Suave)",
    description: "Inflexión mexicana natural y moderada para contenido general.",
    directionCue: "Natural, moderate Mexican Spanish pronunciation with clear neutral articulation",
  },
  {
    id: "es_co",
    name: "Español de Colombia (Neutro)",
    description: "Dicción colombiana pausada y nítida para explicaciones y relatos.",
    directionCue: "Clear, neutral Colombian Spanish pronunciation with balanced rhythm",
  },
  {
    id: "es_ar",
    name: "Español Rioplatense (Suave)",
    description: "Cadencia rioplatense moderada para relatos o personajes específicos.",
    directionCue: "Natural, moderate Rioplatense Spanish pronunciation",
  },
  {
    id: "es_es",
    name: "Español de España (Castellano)",
    description: "Solo si el proyecto audiovisual está dirigido específicamente a España.",
    directionCue: "Standard Peninsular (Spain) Spanish pronunciation",
  },
];

export const DEFAULT_GLOSSARY: PronunciationEntry[] = [
  { id: "g1", term: "kWh", spokenForm: "kilovatios hora", notes: "Unidad de energía eléctrica" },
  { id: "g2", term: "Hz", spokenForm: "hercios", notes: "Frecuencia eléctrica" },
  { id: "g3", term: "120 V", spokenForm: "ciento veinte voltios", notes: "Tensión nominal residencial" },
  { id: "g4", term: "20 A", spokenForm: "veinte amperios", notes: "Corriente nominal" },
  { id: "g5", term: "GFCI", spokenForm: "ge efe ce i", notes: "Interruptor de circuito por falla a tierra" },
  { id: "g6", term: "EPP", spokenForm: "e pe pe", notes: "Equipo de protección personal" },
  { id: "g7", term: "NEC", spokenForm: "ene e ce", notes: "Código Eléctrico Nacional" },
  { id: "g8", term: "LED", spokenForm: "led", notes: "Pronunciado como palabra" },
];

/**
 * The 5 Mandatory Verification Scenarios from Section 18 of the Master Prompt,
 * directly accessible as studio templates for instant production and testing.
 */
export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: "prueba_1_educativa",
    testBadge: "Prueba 1",
    category: "Educativo · Electricidad",
    title: "Cómo funciona un circuito eléctrico",
    description: "Narración educativa clara, cercana, natural y precisa sobre el flujo de corriente.",
    modeId: "modo_d_educativo",
    vocalStyle: "voz_educativa",
    emotion: "confianza",
    emotionIntensity: "moderada",
    pauseStyle: "natural_ideas",
    primaryVoiceId: "Fenrir",
    targetDurationSec: 32,
    script: `[Escena 1 - Tono cercano y didáctico]
¿Alguna vez te has preguntado qué ocurre exactamente dentro de la pared cuando presionas un interruptor?

En realidad, un circuito eléctrico funciona como un camino cerrado por donde viaja la energía. Todo comienza en la fuente de alimentación, que impulsa a los electrones a través de un conductor de cobre.

[Pausa breve para mostrar animación del circuito]
Cuando el interruptor está abierto, el camino se interrumpe y la lámpara permanece apagada. Pero en cuanto lo cierras, el circuito se completa, la corriente fluye de forma continua y transforma esa energía eléctrica en luz. Comprender este principio básico es el primer paso para trabajar con electricidad de manera segura.`,
  },
  {
    id: "prueba_2_cuento",
    testBadge: "Prueba 2",
    category: "Cuento Infantil · Arco Emocional",
    title: "El farol escondido en el árbol",
    description: "Progresión natural de curiosidad a asombro y alegría sin exageraciones artificiales.",
    modeId: "modo_c_cuentos",
    vocalStyle: "narrador_calido",
    emotion: "curiosidad",
    emotionIntensity: "moderada",
    pauseStyle: "emocional",
    primaryVoiceId: "Kore",
    targetDurationSec: 35,
    script: `[Inicio - Curiosidad moderada]
Al caer la tarde, Sofía caminaba por el patio buscando su pelota roja, cuando notó un pequeño destello dorado entre las raíces del viejo árbol de mango.

[Descubrimiento - Asombro creciente, pausa breve]
Se agachó despacio, apartó dos hojas secas y se quedó sin palabras. Allí adentro no había un juguete olvidado, sino una diminuta linterna de cristal rodeada de luciérnagas que parecían saludarla.

[Resolución - Alegría cálida y genuina]
Sofía sonrió con los ojos muy abiertos. Por fin había encontrado el secreto más mágico de todo el jardín, y supo que esa noche tendría la mejor historia para contarle a su abuelo.`,
  },
  {
    id: "prueba_3_suspenso",
    testBadge: "Prueba 3",
    category: "Cinematográfico · Suspenso",
    title: "La señal en la subestación",
    description: "Escena de peligro con pausas calculadas, tensión contenida y cambio de energía.",
    modeId: "modo_b_cinematografico",
    vocalStyle: "voz_suspenso",
    emotion: "suspenso",
    emotionIntensity: "marcada",
    pauseStyle: "dramatica",
    primaryVoiceId: "Charon",
    targetDurationSec: 30,
    script: `[Ambiente tenso, voz contenida]
El pasillo de la subestación estaba en completo silencio. Solo se escuchaba el zumbido lejano del transformador principal.

[Pausa dramática - Aumento de tensión]
De pronto, el indicador rojo del tablero comenzó a parpadear. La temperatura subía segundo tras segundo y la compuerta de emergencia se cerró de golpe detrás de ellos.

[Urgencia enfocada]
Tenían menos de diez segundos para cortar la línea auxiliar antes de que la sobrecarga alcanzara el núcleo. Sin dudarlo, tomó la palanca aislada y tiró hacia abajo con todas sus fuerzas.`,
  },
  {
    id: "prueba_4_dialogo",
    testBadge: "Prueba 4",
    category: "Diálogo · Dos Personajes",
    title: "Elena y Mateo en el taller",
    description: "Conversación entre dos personajes con voces diferenciadas y continuidad estricta.",
    modeId: "modo_e_dialogos",
    vocalStyle: "conversacion_cotidiana",
    emotion: "curiosidad",
    emotionIntensity: "moderada",
    pauseStyle: "conversacional",
    primaryVoiceId: "Kore",
    targetDurationSec: 34,
    script: `Elena: (curiosa) Mateo, ¿ya revisaste por qué el motor del robot se detiene justo al girar a la izquierda?
Mateo: (pensativo, sereno) Sí, acabo de medir la batería y tiene carga completa. El problema no está en la energía principal.
Elena: (sorprendida) ¿Entonces es el sensor óptico o un cable flojo en la placa?
Mateo: (aliviado, con humor suave) Mira aquí abajo. Conectamos la resistencia de control al revés, así que el sensor pensaba que siempre había una pared enfrente.
Elena: (alegre y aliviada) Con razón frenaba en seco. Cambiémosla ahora y hagamos la prueba en la pista.`,
    suggestedCast: [
      {
        speaker: "Elena",
        voiceId: "Kore",
        defaultStyle: "conversacion_cotidiana",
        characterNote: "Joven ingeniera curiosa, expresiva y ágil",
      },
      {
        speaker: "Mateo",
        voiceId: "Puck",
        defaultStyle: "conversacion_cotidiana",
        characterNote: "Compañero técnico calmado, analítico y amigable",
      },
    ],
  },
  {
    id: "prueba_5_tecnico",
    testBadge: "Prueba 5",
    category: "Técnico · Seguridad Eléctrica",
    title: "Protocolo de inspección con multímetro",
    description: "Terminología eléctrica, herramientas, unidades y siglas con pronunciación precisa en español.",
    modeId: "modo_d_educativo",
    vocalStyle: "narracion_tecnica",
    emotion: "confianza",
    emotionIntensity: "moderada",
    pauseStyle: "natural_ideas",
    primaryVoiceId: "Fenrir",
    targetDurationSec: 38,
    script: `[Escena técnica - Precisión y claridad profesional]
Antes de intervenir un tablero residencial de 120 V a 60 Hz, verifica siempre tu EPP completo: guantes dieléctricos, gafas de seguridad y calzado aislante.

Desenergiza el interruptor termomagnético de 20 A y confirma la ausencia de tensión utilizando un multímetro digital categoría tres.

[Pausa breve de seguridad]
En zonas húmedas como cocinas o baños, las normas del NEC exigen instalar tomacorrientes con protección GFCI y verificar la continuidad de la puesta a tierra. Una lectura confiable y una conexión firme evitan fallas, cortocircuitos y pérdidas innecesarias de kWh.`,
  },
];
