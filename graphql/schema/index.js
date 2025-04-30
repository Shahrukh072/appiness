const { gql } = require('apollo-server-express');

module.exports = gql`
  type CustomerSpending {
    customerId: ID!
    totalSpent: Float!
    averageOrderValue: Float!
    lastOrderDate: String
  }

  type TopProduct {
    productId: ID!
    name: String!
    totalSold: Int!
  }

  type CategoryRevenue {
    category: String!
    revenue: Float!
  }

  type SalesAnalytics {
    totalRevenue: Float!
    completedOrders: Int!
    categoryBreakdown: [CategoryRevenue!]!
  }

  input CustomerInput {
  name: String!
  email: String!
  age: Int!
  location: String!
  gender: String!
}

  input ProductInput {
  name: String!
  category: String!
  price: Float!
  stock: Int!
} 

  input OrderProductInput {
  productId: ID!
  quantity: Int!
}

type Order {
  _id: ID!
  customerId: ID!
  products: [OrderProduct!]!
  totalAmount: Float!
  orderDate: String!
  status: String!
}

type OrderProduct {
  productId: ID!
  quantity: Int!
  priceAtPurchase: Float!
}

type Product {
  _id: ID!
  name: String!
  category: String!
  price: Float!
  stock: Int!
}

type Customer {
  _id: ID!
  name: String!
  email: String!
  age: Int!
  location: String!
  gender: String!
}

type Mutation {
  createManyCustomers(input: [CustomerInput!]!): [Customer]
  createManyProducts(input: [ProductInput!]!): [Product]
  placeOrder(customerId: ID!, products: [OrderProductInput!]!): Order
}


  type Query {
    getCustomerSpending(customerId: ID!): CustomerSpending
    getTopSellingProducts(limit: Int!): [TopProduct]
    getSalesAnalytics(startDate: String!, endDate: String!): SalesAnalytics
    getCustomerOrders(customerId: ID!, limit: Int!, offset: Int!): [Order]
  }
`;
