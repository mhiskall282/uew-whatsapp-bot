const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Location = sequelize.define('Location', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Official name of the location',
  },
  aliases: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    allowNull: false,
    comment: 'Alternative names students might use',
  },
  type: {
    type: DataTypes.ENUM(
      'hall',
      'department',
      'lecture_hall',
      'office',
      'library',
      'cafeteria',
      'hostel',
      'sports',
      'gate',
      'landmark',
      'other'
    ),
    allowNull: false,
  },
  campus: {
    type: DataTypes.ENUM('central', 'north', 'south', 'ajumako'),
    allowNull: false,
    comment: 'Which campus the location belongs to',
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    validate: {
      min: -90,
      max: 90,
    },
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    validate: {
      min: -180,
      max: 180,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Brief description of the location',
  },
  landmarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Nearby landmarks for easier navigation',
  },
  opening_hours: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  tableName: 'locations',
  indexes: [
    {
      fields: ['name'],
    },
    {
      fields: ['type'],
    },
    {
      fields: ['campus'],
    },
    {
      fields: ['is_active'],
    },
    {
      type: 'GIN',
      fields: ['aliases'],
    },
  ],
});

// Instance method to generate Google Maps link
Location.prototype.getGoogleMapsUrl = function() {
  return `https://www.google.com/maps/search/?api=1&query=${this.latitude},${this.longitude}`;
};

// Static method to find location by name or alias
Location.findByNameOrAlias = async function(searchTerm) {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  const { Op } = require('sequelize');
  
  return await Location.findAll({
    where: {
      is_active: true,
      [Op.or]: [
        sequelize.where(
          sequelize.fn('LOWER', sequelize.col('name')),
          Op.like,
          `%${normalizedSearch}%`
        ),
        sequelize.where(
          sequelize.fn('array_to_string', sequelize.col('aliases'), ' '),
          Op.iLike,
          `%${normalizedSearch}%`
        ),
      ],
    },
    limit: 5,
  });
};

module.exports = Location;
