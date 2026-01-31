require('dotenv').config();
const { Location, sequelize } = require('../models');

const locations = [
  {
    name: 'Aggrey Hall',
    aliases: ['aggrey', 'great hall'],
    type: 'hall',
    campus: 'central',
    latitude: 5.5438,
    longitude: -0.3494,
    description: 'Main assembly hall for university events',
    landmarks: 'Near the main gate, opposite the library',
  },
  {
    name: 'University Library',
    aliases: ['library', 'main library', 'sam jonah library'],
    type: 'library',
    campus: 'central',
    latitude: 5.5445,
    longitude: -0.3501,
    description: 'Main university library with study areas and resources',
    opening_hours: 'Mon-Fri: 8am-10pm, Sat-Sun: 9am-6pm',
    landmarks: 'Opposite Aggrey Hall, near the fountain',
  },
  {
    name: 'North Campus (Simpa A)',
    aliases: ['north campus', 'simpa a', 'simpa', 'nc'],
    type: 'landmark',
    campus: 'north',
    latitude: 5.5512,
    longitude: -0.3467,
    description: 'North Campus area with various departments',
    landmarks: 'Near the sports complex',
  },
  {
    name: 'SRC Office',
    aliases: ['src', 'student representative council'],
    type: 'office',
    campus: 'central',
    latitude: 5.5442,
    longitude: -0.3498,
    description: 'Student Representative Council office',
    opening_hours: 'Mon-Fri: 9am-5pm',
  },
  {
    name: 'Main Gate',
    aliases: ['entrance', 'front gate', 'main entrance'],
    type: 'gate',
    campus: 'central',
    latitude: 5.5435,
    longitude: -0.3490,
    description: 'Main university entrance',
  },
  {
    name: 'Faculty of Education Building',
    aliases: ['education building', 'foe', 'education faculty'],
    type: 'department',
    campus: 'central',
    latitude: 5.5448,
    longitude: -0.3505,
    description: 'Faculty of Education main building',
  },
  {
    name: 'ICT Directorate',
    aliases: ['ict', 'computer center', 'it directorate'],
    type: 'office',
    campus: 'central',
    latitude: 5.5440,
    longitude: -0.3496,
    description: 'ICT services and support center',
    opening_hours: 'Mon-Fri: 8am-5pm',
  },
  {
    name: 'University Cafeteria',
    aliases: ['cafeteria', 'canteen', 'dining hall'],
    type: 'cafeteria',
    campus: 'central',
    latitude: 5.5443,
    longitude: -0.3499,
    description: 'Main cafeteria serving breakfast, lunch, and dinner',
    opening_hours: '7am-9pm daily',
  },
];

async function seedLocations() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    await Location.destroy({ where: {} });
    console.log('✓ Cleared existing locations');

    for (const loc of locations) {
      await Location.create(loc);
      console.log(`✓ Added: ${loc.name}`);
    }

    console.log(`\n✓ Successfully seeded ${locations.length} locations!`);
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

seedLocations();