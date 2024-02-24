const express = require('express');
const user = require('../models/userModel');
const product = require('../models/productModel');
const responseFunction = require('../utils/responseFunction');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const authTokenHandler = require('../middleware/checkAuthToken');

const saltRounds = process.env.SALT_ROUNDS;
const name = process.env.APP_NAME;
const mins = process.env.OTP_EXPIRY_TIME;
const senderEmail = process.env.SENDER_EMAIL_ID;
const senderPass = process.env.SENDER_PASSWORD;

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: senderEmail,
        pass: senderPass
    }
});

const router = express.Router();

router.post('/create-item', async (req, res, next) => {
    const { seller } = req.body;
    try {
        const account = user.findOne({ username: seller });
        if (account) {
            if (account.role === 'user') return responseFunction(res, 403, 'Permission denied', null, false);
        }
        const newProduct = new product(req.body);
        const result = await newProduct.save();
        return responseFunction(res, 200, 'Product created successfully', result, true);
    } catch (error) {
        return responseFunction(res, 400, 'Error creating product', error.message, false);
    }
})

router.get('/all-items', async (req, res, next) => {
    const { seller } = req.body;
    try {
        const result = await product.find(seller ? { seller } : {});
        return responseFunction(res, 200, 'All products fetched successfully', result, true);
    } catch (error) {
        return responseFunction(res, 400, 'Error getting all products', error.message, false);
    }
});

router.delete('/delete-item', async (req, res, next) => {
    const { username, id } = req.body;
    try {
        const userDetails = await user.findOne({ username });
        if (userDetails.role === 'user') return responseFunction(res, 403, 'Permission denied', null, false);
        const result = await product.findOne({ _id: id });
        if (!userDetails.isAdmin && result.seller !== username) return responseFunction(res, 403, 'Permission denied', null, false);
        await result.deleteOne();
        return responseFunction(res, 200, 'Product deleted successfully', null, true);
    } catch (error) {
        return responseFunction(res, 400, 'Error deleting product', error.message, false);
    }
});

module.exports = router;