require('dotenv').config();
const { sequelize } = require('./src/models');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection successful');
    
    await sequelize.sync({ force: true }); // Creates tables
    console.log('✓ Tables created');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testConnection();