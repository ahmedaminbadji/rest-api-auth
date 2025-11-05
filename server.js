
// src/server.js
const { app, connectDB } = require('./app');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to the database (the one in your docker-compose)
  await connectDB();
  
  // Start listening
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

startServer();