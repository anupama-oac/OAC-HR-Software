const express = require('express');
const router = express.Router();
const designationController = require('../controllers/designation.controller');

router.post('/add', designationController.addDesignation);
router.get('/find', designationController.findDesignations);
router.patch('/update/:id', designationController.updateDesignation);
router.delete('/delete/:id', designationController.deleteDesignation);
router.get('/byroleid/:id', designationController.getDesignationsByRoleId);







module.exports = router