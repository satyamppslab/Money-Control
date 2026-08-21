const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  filename: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  ocrData: {
    merchant: String,
    amount: Number,
    date: Date,
    items: [
      {
        name: String,
        price: Number,
      }
    ],
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Receipt', receiptSchema);
