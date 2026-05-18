const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth');
const userController = require('../controllers/user.controller');

const upload = require('../utils/userImageMulter');


router.post('/', authController.Login);
router.patch('/resetpassword/:id', authController.resetPassword);

router.post('/add', authenticateToken, userController.addUser);
router.get('/find', authenticateToken, userController.findAllUsers);
router.get('/search/name', authenticateToken, userController.UserSearchName);
router.patch('/statusupdate/:id', authenticateToken, userController.updateStatus);
router.get('/findone/:id', authenticateToken, userController.UserFindOne);
router.patch('/update/:id', authenticateToken, userController.UpdateUser);
router.patch('/imageupdate/:id', authenticateToken, userController.UpdateImage);
router.delete('/delete/:id', authenticateToken, userController.DeleteUser);
router.get('/findbyrole/:id', authenticateToken, userController.FindByRole);
router.get('/findbyroleName/:roleName', authenticateToken, userController.FindRoleByRolename);
router.get('/getdirectors', authenticateToken, userController.FindDirectors);
router.get('/getseparated', authenticateToken, userController.FindSeparated);
router.get('/getbyrm/:id', authenticateToken, userController.findReportingManager);
router.post('/fileupload', upload.single('file'), authenticateToken, userController.fileUpload);
router.delete('/filedelete', authenticateToken, userController.fileDelete);
router.delete('/filedeletebyurl', authenticateToken, userController.fileDeleteByURL);
router.get('/underprobation', authenticateToken, userController.underProbation);
router.get('/confirmed', authenticateToken, userController.confirmed);
router.get('/confirmemployee/:id', authenticateToken, userController.confirmEmployee);
router.get('/', authenticateToken, userController.findTotalAllUsers);
router.patch('/resignemployee/:id', authenticateToken, userController.resignEmployee);
router.patch('/editnote/:id', authenticateToken, userController.editNote);



module.exports = router;