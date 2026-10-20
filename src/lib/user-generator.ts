const CINEMA_NAMES = [
  'Director Fox',
  'Tungsten Reel',
  'Velvet Rebel',
  'Technicolor Ace',
  'Marquee Pilot',
  'Celluloid Cat',
  'Analog Spark',
  'Silver Screen',
  'Kino Nomad',
  'Projector Pete',
  'Flicker Hawk',
  'Vintage Nova',
  'Aperture Ghost',
  'Boom Mic Ben',
  'Film Noir Echo',
  'Cinema Scribe',
];

const WARM_PALETTES = [
  '#F59E0B', // Tungsten Amber
  '#D97706', // Deep Gold
  '#E11D48', // Velvet Crimson
  '#EA580C', // Amber Orange
  '#10B981', // Tally Green
  '#06B6D4', // Cinema Cyan
  '#8B5CF6', // 35mm Violet
  '#F43F5E', // Rose Quartz
];

export function generateRandomUser(customSeed?: string) {
  const seed = customSeed || Math.random().toString(36).substring(2, 9);
  const nameIndex = Math.floor(Math.random() * CINEMA_NAMES.length);
  const colorIndex = Math.floor(Math.random() * WARM_PALETTES.length);

  const name = CINEMA_NAMES[nameIndex];
  const color = WARM_PALETTES[colorIndex];
  const id = `guest_${Math.random().toString(36).substring(2, 8)}`;
  const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name + seed)}&backgroundColor=${color.replace('#', '')}`;

  return { id, name, color, avatar };
}
