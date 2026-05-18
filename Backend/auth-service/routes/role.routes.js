const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const roleController=require('../controllers/role.controller');


router.post('/', authenticateToken, roleController.AddRole);
router.get('/', authenticateToken, roleController.GetRoles);
router.get('/find', authenticateToken, roleController.FindRoles);
router.get('/findbyid/:id', authenticateToken, roleController.FindRoleById);
router.get('/rolename', authenticateToken, roleController.FindRoleByName);
router.delete('/:id', authenticateToken, roleController.DeleteRole);
router.patch('/:id', authenticateToken, roleController.UpdateRole);
router.patch('/statusupdate/:id', authenticateToken, roleController.UpdateStatus);
router.get('/search/name', authenticateToken, roleController.SearchRoleByName);









module.exports = router;