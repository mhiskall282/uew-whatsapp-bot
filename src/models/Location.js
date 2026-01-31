// src/models/Location.js
const { DataTypes, Op } = require("sequelize");

module.exports = (sequelize) => {
  const Location = sequelize.define(
    "Location",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        unique: true,
      },

      aliases: {
        // Postgres supports ARRAY(TEXT)
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: false,
        defaultValue: [],
      },

      type: {
        type: DataTypes.ENUM(
          "hall",
          "library",
          "office",
          "department",
          "hostel",
          "cafeteria",
          "gate",
          "landmark",
          "other"
        ),
        allowNull: false,
        defaultValue: "other",
      },

      campus: {
        type: DataTypes.ENUM("central", "north", "south", "ajumako", "other"),
        allowNull: false,
        defaultValue: "central",
      },

      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },

      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      landmarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      opening_hours: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "locations",
      underscored: true,
      timestamps: true,
      indexes: [{ fields: ["name"] }, { fields: ["campus"] }, { fields: ["type"] }, { fields: ["is_active"] }],
    }
  );

  // ✅ Instance method
  Location.prototype.getGoogleMapsUrl = function () {
    if (this.latitude == null || this.longitude == null) return null;
    return `https://www.google.com/maps?q=${this.latitude},${this.longitude}`;
  };

  // ✅ Static method: search by name or alias (case-insensitive)
  Location.findByNameOrAlias = async function (searchTerm) {
    const term = (searchTerm || "").trim().toLowerCase();
    if (!term) return null;

    // 1) Try name match
    let loc = await Location.findOne({
      where: sequelize.where(
        sequelize.fn("lower", sequelize.col("name")),
        { [Op.like]: `%${term}%` }
      ),
    });
    if (loc) return loc;

    // 2) Try aliases match (ARRAY)
    // This checks if ANY alias matches the term (exact-ish)
    loc = await Location.findOne({
      where: {
        aliases: {
          [Op.overlap]: [term],
        },
      },
    });
    if (loc) return loc;

    // 3) Fallback: scan aliases with LIKE via unnest (more flexible)
    // Works on Postgres
    loc = await Location.findOne({
      where: sequelize.literal(
        `EXISTS (SELECT 1 FROM unnest("aliases") a WHERE lower(a) LIKE '%${term.replace(/'/g, "''")}%')`
      ),
    });

    return loc;
  };

  return Location;
};
