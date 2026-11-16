const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotion.controller');
const { authenticateToken } = require('../middlewares/auth');

router.post(['/', '/promotion'], authenticateToken, promotionController.applyPromotion);
router.get(['/', '/promotion'], authenticateToken, promotionController.getPromotions);
router.get(['/:id', '/promotion/:id'], authenticateToken, promotionController.getPromotionById);

module.exports = router;
