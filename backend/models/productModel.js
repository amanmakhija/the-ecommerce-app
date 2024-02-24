const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    seller: {
        type: String,
    },
    brand: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        default: 0
    },
    reviews: [
        {
            user: {
                type: String,
            },
            rating: {
                type: Number
            },
            headline: {
                type: String
            },
            review: {
                type: String
            },
            images: [
                {
                    type: String
                }
            ],
            videos: [
                {
                    type: String
                }
            ],
            date: {
                type: Date,
                default: Date.now()
            }
        }
    ],
    price: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    productPictures: [
        {
            type: String,
            required: true
        }
    ],
    productDetails: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);