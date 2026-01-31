const { Location } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

class NavigationService {
  /**
   * Find location by name or alias
   * @param {string} searchTerm 
   * @returns {Promise<Location|null>}
   */
  async findLocation(searchTerm) {
    if (!searchTerm) return null;

    try {
      const locations = await Location.findByNameOrAlias(searchTerm);
      
      if (locations.length === 0) {
        return null;
      }
      
      // Return the best match (first result)
      return locations[0];
    } catch (error) {
      logger.error('Location search failed', { searchTerm, error: error.message });
      return null;
    }
  }

  /**
   * Generate Google Maps directions URL
   * @param {Location} origin 
   * @param {Location} destination 
   * @returns {string}
   */
  generateDirectionsUrl(origin, destination) {
    if (!origin || !destination) {
      // If no origin, just show destination
      if (destination) {
        return `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`;
      }
      return null;
    }

    // Generate directions URL
    const originCoords = `${origin.latitude},${origin.longitude}`;
    const destCoords = `${destination.latitude},${destination.longitude}`;
    
    return `https://www.google.com/maps/dir/?api=1&origin=${originCoords}&destination=${destCoords}&travelmode=walking`;
  }

  /**
   * Calculate approximate walking distance and time
   * @param {Location} origin 
   * @param {Location} destination 
   * @returns {Object} {distance: number (km), time: number (minutes)}
   */
  calculateDistance(origin, destination) {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    
    const lat1 = parseFloat(origin.latitude) * Math.PI / 180;
    const lat2 = parseFloat(destination.latitude) * Math.PI / 180;
    const deltaLat = (parseFloat(destination.latitude) - parseFloat(origin.latitude)) * Math.PI / 180;
    const deltaLon = (parseFloat(destination.longitude) - parseFloat(origin.longitude)) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    // Assume average walking speed of 5 km/h
    const time = Math.ceil((distance / 5) * 60); // Time in minutes

    return {
      distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
      time,
    };
  }

  /**
   * Generate navigation response
   * @param {string} originName 
   * @param {string} destinationName 
   * @returns {Promise<string>}
   */
  async generateNavigationResponse(originName, destinationName) {
    try {
      // Find destination (required)
      const destination = await this.findLocation(destinationName);
      
      if (!destination) {
        return `I couldn't find the location "${destinationName}". Please check the spelling or try a different name. You can ask "What locations do you know?" to see available places.`;
      }

      // Find origin (optional)
      let origin = null;
      if (originName) {
        origin = await this.findLocation(originName);
      }

      let response = '';

      if (origin) {
        // Both origin and destination provided
        const { distance, time } = this.calculateDistance(origin, destination);
        const mapsUrl = this.generateDirectionsUrl(origin, destination);

        response = `📍 **Route: ${origin.name} → ${destination.name}**\n\n`;
        response += `📏 Distance: ~${distance} km\n`;
        response += `⏱️ Walking time: ~${time} minutes\n\n`;
        
        if (destination.landmarks) {
          response += `🗺️ Landmarks: ${destination.landmarks}\n\n`;
        }

        response += `🔗 Google Maps directions:\n${mapsUrl}\n\n`;
        response += `💡 Tip: Click the link above for turn-by-turn directions!`;
      } else {
        // Only destination provided
        const mapsUrl = destination.getGoogleMapsUrl();

        response = `📍 **Location: ${destination.name}**\n\n`;
        response += `🏫 Campus: ${destination.campus.charAt(0).toUpperCase() + destination.campus.slice(1)}\n`;
        response += `📝 Type: ${destination.type.replace('_', ' ')}\n\n`;
        
        if (destination.description) {
          response += `ℹ️ ${destination.description}\n\n`;
        }
        
        if (destination.landmarks) {
          response += `🗺️ Landmarks: ${destination.landmarks}\n\n`;
        }

        if (destination.opening_hours) {
          response += `🕐 Hours: ${destination.opening_hours}\n\n`;
        }

        response += `🔗 View on Google Maps:\n${mapsUrl}\n\n`;
        response += `💡 Tip: Share your current location with me to get directions!`;
      }

      logger.info('Navigation response generated', {
        origin: origin?.name,
        destination: destination.name,
      });

      return response;
    } catch (error) {
      logger.error('Navigation response generation failed', {
        error: error.message,
      });
      return "I encountered an error while generating directions. Please try again.";
    }
  }

  /**
   * List all available locations
   * @param {string} campus - Filter by campus (optional)
   * @returns {Promise<string>}
   */
  async listLocations(campus = null) {
    try {
      const where = { is_active: true };
      if (campus) {
        where.campus = campus;
      }

      const locations = await Location.findAll({
        where,
        order: [['campus', 'ASC'], ['name', 'ASC']],
      });

      if (locations.length === 0) {
        return "No locations found in the database.";
      }

      let response = '📍 **Available Locations:**\n\n';
      
      // Group by campus
      const campuses = [...new Set(locations.map(loc => loc.campus))];
      
      campuses.forEach(camp => {
        const campusLocs = locations.filter(loc => loc.campus === camp);
        response += `**${camp.charAt(0).toUpperCase() + camp.slice(1)} Campus:**\n`;
        campusLocs.forEach(loc => {
          response += `  • ${loc.name}\n`;
        });
        response += '\n';
      });

      response += '💡 Ask "How do I get to [location]?" for directions!';

      return response;
    } catch (error) {
      logger.error('List locations failed', { error: error.message });
      return "I encountered an error while fetching locations.";
    }
  }
}

module.exports = new NavigationService();