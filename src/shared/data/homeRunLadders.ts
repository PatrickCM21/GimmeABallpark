import type { HomeRunLadder } from '../types/homeRun';

/**
 * Daily Home Run ladders. Each ladder has exactly 4 rounds, ordered so the ratio
 * between the two values shrinks every round (obvious -> razor-thin).
 *
 * Values are rounded, widely-cited figures; `display` is what players see on reveal.
 * Order of a/b is intentionally mixed so the bigger value isn't always on the same side.
 */
export const homeRunLadders: readonly HomeRunLadder[] = [
  {
    id: 'giants',
    title: 'Giants & Heights',
    rounds: [
      {
        a: { label: 'Population of Tokyo (metro)', emoji: '🗼', value: 37_000_000, display: '~37 million' },
        b: { label: 'Weight of a blue whale (kg)', emoji: '🐋', value: 150_000, display: '~150,000 kg' },
      },
      {
        a: { label: 'Height of the Eiffel Tower (feet)', emoji: '🇫🇷', value: 1_083, display: '~1,083 ft' },
        b: { label: 'Height of Mt Kilimanjaro (metres)', emoji: '⛰️', value: 5_895, display: '5,895 m' },
      },
      {
        a: { label: 'Length of the Great Wall (km)', emoji: '🧱', value: 21_196, display: '~21,196 km' },
        b: { label: "Earth's circumference (km)", emoji: '🌍', value: 40_075, display: '~40,075 km' },
      },
      {
        a: { label: 'Length of the Nile (km)', emoji: '🏜️', value: 6_650, display: '~6,650 km' },
        b: { label: 'Length of the Amazon (km)', emoji: '🌴', value: 6_400, display: '~6,400 km' },
      },
    ],
  },
  {
    id: 'numbers',
    title: 'Everyday Numbers',
    rounds: [
      {
        a: { label: 'Seconds in a day', emoji: '⏱️', value: 86_400, display: '86,400' },
        b: { label: 'Pixels on a 4K screen', emoji: '📺', value: 8_294_400, display: '8,294,400' },
      },
      {
        a: { label: 'Keys on a piano', emoji: '🎹', value: 88, display: '88' },
        b: { label: 'Pokémon species', emoji: '⚡', value: 1_025, display: '~1,025' },
      },
      {
        a: { label: 'Elements in the periodic table', emoji: '🧪', value: 118, display: '118' },
        b: { label: 'Squares on a chessboard', emoji: '♟️', value: 64, display: '64' },
      },
      {
        a: { label: 'Bones in an adult human', emoji: '🦴', value: 206, display: '206' },
        b: { label: 'UN member states', emoji: '🇺🇳', value: 193, display: '193' },
      },
    ],
  },
  {
    id: 'wonders',
    title: 'Wonders & Peaks',
    rounds: [
      {
        a: { label: 'Capacity of Wembley Stadium', emoji: '🏟️', value: 90_000, display: '~90,000' },
        b: { label: 'Population of India', emoji: '🇮🇳', value: 1_430_000_000, display: '~1.43 billion' },
      },
      {
        a: { label: 'Length of a marathon (metres)', emoji: '🏃', value: 42_195, display: '42,195 m' },
        b: { label: 'Length of an Olympic pool (centimetres)', emoji: '🏊', value: 5_000, display: '5,000 cm' },
      },
      {
        a: { label: 'Height of the Burj Khalifa (m)', emoji: '🏙️', value: 828, display: '828 m' },
        b: { label: 'Height of the Eiffel Tower (m)', emoji: '🗼', value: 330, display: '~330 m' },
      },
      {
        a: { label: 'Height of K2 (m)', emoji: '🏔️', value: 8_611, display: '8,611 m' },
        b: { label: 'Height of Mt Everest (m)', emoji: '🗻', value: 8_849, display: '8,849 m' },
      },
    ],
  },
  {
    id: 'space',
    title: 'Space & Speed',
    rounds: [
      {
        a: { label: 'Distance to the Moon (km)', emoji: '🌙', value: 384_400, display: '~384,400 km' },
        b: { label: 'Height of the Statue of Liberty (ft)', emoji: '🗽', value: 305, display: '305 ft' },
      },
      {
        a: { label: 'Depth of the Mariana Trench (m)', emoji: '🌊', value: 10_935, display: '~10,935 m' },
        b: { label: 'Height of the Eiffel Tower (ft)', emoji: '🗼', value: 1_083, display: '~1,083 ft' },
      },
      {
        a: { label: 'Top speed of a cheetah (km/h)', emoji: '🐆', value: 110, display: '~110 km/h' },
        b: { label: 'Speed of sound (m/s)', emoji: '🔊', value: 343, display: '~343 m/s' },
      },
      {
        a: { label: 'Days in a Mars year', emoji: '🔴', value: 687, display: '~687' },
        b: { label: 'Days in two Earth years', emoji: '📅', value: 730, display: '730' },
      },
    ],
  },
  {
    id: 'time',
    title: 'Time After Time',
    rounds: [
      {
        a: { label: 'People on Earth', emoji: '🧑‍🤝‍🧑', value: 8_100_000_000, display: '~8.1 billion' },
        b: { label: 'Days in a century', emoji: '📆', value: 36_525, display: '~36,525' },
      },
      {
        a: { label: 'Hours in an average month', emoji: '🗓️', value: 730, display: '~730' },
        b: { label: 'Minutes in a week', emoji: '⌛', value: 10_080, display: '10,080' },
      },
      {
        a: { label: 'Seconds in an hour', emoji: '⏲️', value: 3_600, display: '3,600' },
        b: { label: 'Hours in a year', emoji: '🌞', value: 8_760, display: '8,760' },
      },
      {
        a: { label: 'Heartbeats in a day', emoji: '❤️', value: 100_000, display: '~100,000' },
        b: { label: 'Seconds in a day', emoji: '⏱️', value: 86_400, display: '86,400' },
      },
    ],
  },
  {
    id: 'tech',
    title: 'Bits & Bricks',
    rounds: [
      {
        a: { label: 'Keys on a standard keyboard', emoji: '⌨️', value: 104, display: '~104' },
        b: { label: 'Google searches per day', emoji: '🔍', value: 8_500_000_000, display: '~8.5 billion' },
      },
      {
        a: { label: 'Lines of code in the Linux kernel', emoji: '🐧', value: 38_000_000, display: '~38 million' },
        b: { label: 'Pixels on a 720p screen', emoji: '🖥️', value: 921_600, display: '921,600' },
      },
      {
        a: { label: 'Bricks in the Empire State Building', emoji: '🏢', value: 10_000_000, display: '~10 million' },
        b: { label: 'Pixels on a 1080p screen', emoji: '📱', value: 2_073_600, display: '2,073,600' },
      },
      {
        a: { label: 'Pixels on a 4K screen', emoji: '📺', value: 8_294_400, display: '8,294,400' },
        b: { label: 'English Wikipedia articles', emoji: '📚', value: 7_000_000, display: '~7 million' },
      },
    ],
  },
  {
    id: 'beasts',
    title: 'Beasts of the Wild',
    rounds: [
      {
        a: { label: 'Weight of a house cat (kg)', emoji: '🐈', value: 4, display: '~4 kg' },
        b: { label: 'Weight of a blue whale (kg)', emoji: '🐋', value: 150_000, display: '~150,000 kg' },
      },
      {
        a: { label: 'Weight of an African elephant (kg)', emoji: '🐘', value: 6_000, display: '~6,000 kg' },
        b: { label: 'Weight of a grizzly bear (kg)', emoji: '🐻', value: 400, display: '~400 kg' },
      },
      {
        a: { label: 'Weight of a male lion (kg)', emoji: '🦁', value: 190, display: '~190 kg' },
        b: { label: 'Weight of a grizzly bear (kg)', emoji: '🐻', value: 400, display: '~400 kg' },
      },
      {
        a: { label: 'Weight of a Siberian tiger (kg)', emoji: '🐅', value: 220, display: '~220 kg' },
        b: { label: 'Weight of a male lion (kg)', emoji: '🦁', value: 190, display: '~190 kg' },
      },
    ],
  },
];

export const findHomeRunLadder = (id: string): HomeRunLadder | undefined =>
  homeRunLadders.find((ladder) => ladder.id === id);
