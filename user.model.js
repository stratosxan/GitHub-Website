const mongoose = require('mongoose');

// Define a schema for each order item
const orderItemSchema = new mongoose.Schema({
    product_name: String,
    price: Number,
    quantity: Number,
    image_path: String
});

const orderSchema = new mongoose.Schema({
    order_id: String,
    orders: [orderItemSchema]
});

// Extend the existing user schema to include the orders array
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    orders: [orderSchema] // Array of order items
});

const User = mongoose.model('User', userSchema);

module.exports = User;
