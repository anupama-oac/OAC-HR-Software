const express = require('express');
const router = express.Router();
const assetDetailController = require('../controllers/assetDetail.controller');

router.get('/findbyuser/:userId', assetDetailController.findDetailsByUser);
router.post('/', assetDetailController.addAssetDetail);
router.patch('/return-asset/:id', assetDetailController.returnAsset);
router.patch('/:id', assetDetailController.updateAssetDetail);

module.exports = router;
