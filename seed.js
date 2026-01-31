require('dotenv').config();
const { Location } = require('./src/models');

const locations = [
  {
    name: 'University Library',
    aliases: ['library', 'main library'],
    type: 'library',
    campus: 'central',
    latitude: 5.5445,
    longitude: -0.3501,
    description: 'Main university library',
    opening_hours: 'Mon-Fri: 8am-10pm',
  },
  {
    name: 'Aggrey Hall',
    aliases: ['aggrey', 'great hall'],
    type: 'hall',
    campus: 'central',
    latitude: 5.5438,
    longitude: -0.3494,
    description: 'Main assembly hall',
  },
  {
    name: 'SRC Office',
    aliases: ['src', 'student council'],
    type: 'office',
    campus: 'central',
    latitude: 5.5442,
    longitude: -0.3498,
    description: 'Student Representative Council office',
  },
];

async function seed() {
  for (const loc of locations) {
    await Location.create(loc);
    console.log(`✓ Added: ${loc.name}`);
  }
  console.log('Done!');
  process.exit(0);
}

seed();