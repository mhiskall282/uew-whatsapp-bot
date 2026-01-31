require('dotenv').config();
const { sequelize } = require('./src/models');

async function init() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');
    
    await sequelize.sync({ force: true });
    console.log('✓ Tables created');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

init();