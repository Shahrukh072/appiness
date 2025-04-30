const Customer = require('../../models/Customer');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const mongoose = require('mongoose');
const redis = require('../../redis');

module.exports = {
  Query: {
    async getCustomerSpending(_, { customerId }) {
      const result = await Order.aggregate([
        { $match: { customerId: new mongoose.Types.ObjectId(customerId), status: 'completed' } },
        {
          $group: {
            _id: '$customerId',
            totalSpent: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' },
            lastOrderDate: { $max: '$orderDate' }
          }
        }
      ]);

      if (result.length === 0) return null;

      return {
        customerId,
        totalSpent: result[0].totalSpent,
        averageOrderValue: result[0].averageOrderValue,
        lastOrderDate: new Date(result[0].lastOrderDate).toISOString()
      };
    },

    async getTopSellingProducts(_, { limit }) {
      const result = await Order.aggregate([
        { $unwind: '$products' },
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: '$products.productId',
            totalSold: { 
              $sum: {
                $multiply: ["$products.quantity", "$products.priceAtPurchase"] // Total revenue
              }
            }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $project: {
            productId: '$_id',
            name: '$product.name',
            totalSold: 1
          }
        }
      ]);

      return result;
    },

    async getSalesAnalytics(_, { startDate, endDate }) {
      const cacheKey = `analytics:${startDate}:${endDate}`;
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
      
      const result = await Order.aggregate([
        {
          $match: {
            status: 'completed',
            orderDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $facet: {
            totalRevenue: [{ $group: { _id: null, total: { $sum: '$totalAmount' } } }],
            completedOrders: [{ $count: 'count' }],
            categoryBreakdown: [
              { $unwind: '$products' },
              {
                $lookup: {
                  from: 'products',
                  localField: 'products.productId',
                  foreignField: '_id',
                  as: 'product'
                }
              },
              { $unwind: '$product' },
              {
                $group: {
                  _id: '$product.category',
                  revenue: {
                    $sum: {
                      $multiply: ['$products.quantity', '$products.priceAtPurchase']
                    }
                  }
                }
              },
              {
                $project: {
                  category: '$_id',
                  revenue: 1,
                  _id: 0
                }
              }
            ]
          }
        }
      ]);

      const response = {
        totalRevenue: result[0].totalRevenue[0]?.total || 0,
        completedOrders: result[0].completedOrders[0]?.count || 0,
        categoryBreakdown: result[0].categoryBreakdown
      };

      await redis.set(cacheKey, JSON.stringify(response), 'EX', 3600); // 1 hour cache

      return response;
    },
    
     // Pagination
     async getCustomerOrders(_, { customerId, limit, offset }) {
      return await Order.find({ customerId, status: 'completed' })
        .sort({ orderDate: -1 })
        .skip(offset)
        .limit(limit);
    }
  },

  Mutation: {
    async createManyCustomers(_, { input }) {
      return await Customer.insertMany(input);
    },
  
    async createManyProducts(_, { input }) {
      return await Product.insertMany(input);
    },
  
    async placeOrder(_, { customerId, products }) {
      let totalAmount = 0;
      const enrichedProducts = [];
  
      for (const p of products) {
        const product = await Product.findById(p.productId);
        if (!product || product.stock < p.quantity) {
          throw new Error(`Invalid or insufficient stock for product: ${p.productId}`);
        }
  
        product.stock -= p.quantity;
        await product.save();
  
        const priceAtPurchase = product.price;
        totalAmount += priceAtPurchase * p.quantity;
  
        enrichedProducts.push({
          productId: p.productId,
          quantity: p.quantity,
          priceAtPurchase
        });
      }
  
      const order = new Order({
        customerId,
        products: enrichedProducts,
        totalAmount,
        orderDate: new Date(),
        status: 'completed'
      });
  
      return await order.save();
    }
  }
  
};
