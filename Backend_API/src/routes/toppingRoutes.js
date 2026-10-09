const router = require('express').Router();
const Topping = require('../models/Topping');

router.get('/', async (req, res) => {
  try {
    res.json(await Topping.find({ status: 'active' }).sort({ name: 1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
