const express = require('express');
const router = express.Router();
const companyAssetController = require('../controllers/companyAsset.controller');

router.get('/find', companyAssetController.findCompanyAssets);
router.post('/add', companyAssetController.addCompanyAsset);
router.patch('/update/:id', companyAssetController.updateCompanyAsset);
router.put('/update/:id', companyAssetController.updateCompanyAsset);
router.delete('/delete/:id', companyAssetController.deleteCompanyAsset);
router.get('/findbyid/:id', companyAssetController.getCompanyAssetById);
router.get('/find/:id', companyAssetController.getCompanyAssetById);

module.exports = router;
