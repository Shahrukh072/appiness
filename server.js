require('dotenv').config();
const express = require('express');
const PORT = process.env.PORT || 4000;
const { ApolloServer } = require('apollo-server-express');
const connectDB = require('./config/db');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers/resolvers');

async function startServer() {
  const app = express();

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app });

  connectDB();

  app.listen(PORT, () => 
  console.log(`Server running at http://localhost:${PORT}${server.graphqlPath}`));
}

startServer();
