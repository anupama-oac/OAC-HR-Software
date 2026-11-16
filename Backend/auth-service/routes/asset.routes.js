const express = require('express');
const router = express.Router();
const assetController = require('../controllers/asset.controller');

router.get('/find', assetController.findAssets);
router.get('/getassigneduser/:id', assetController.getAssignedUsers);
router.post('/', assetController.addAsset);
router.patch('/:id', assetController.updateAsset);
router.put('/:id', assetController.updateAsset);
router.delete('/:id', assetController.deleteAsset);
router.get('/:id', assetController.getAssetById);

module.exports = router;
