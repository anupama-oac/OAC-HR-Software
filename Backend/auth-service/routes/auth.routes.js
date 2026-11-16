const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth');
const userController = require('../controllers/user.controller');

const upload = require('../utils/userImageMulter');


router.post('/', authController.Login);
router.patch('/resetpassword/:id', authController.resetPassword);

router.post(['/add', '/user/add'], authenticateToken, userController.addUser);
router.get(['/find', '/user/find'], authenticateToken, userController.findAllUsers);
router.get(['/search/name', '/user/search/name'], authenticateToken, userController.UserSearchName);
router.patch(['/statusupdate/:id', '/user/statusupdate/:id'], authenticateToken, userController.updateStatus);

router.get(['/user/findone/:id', '/findone/:id'], authenticateToken, userController.UserFindOne);
router.patch(['/update/:id', '/user/update/:id'], authenticateToken, userController.UpdateUser);
router.patch(['/imageupdate/:id', '/user/imageupdate/:id'], authenticateToken, userController.UpdateImage);
router.delete(['/delete/:id', '/user/delete/:id'], authenticateToken, userController.DeleteUser);
router.get(['/findbyrole/:id', '/user/findbyrole/:id'], authenticateToken, userController.FindByRole);
router.get(['/findbyroleName/:roleName', '/user/findbyroleName/:roleName'], authenticateToken, userController.FindRoleByRolename);
router.get(['/getdirectors', '/user/getdirectors'], authenticateToken, userController.FindDirectors);
router.get(['/getseparated', '/user/getseparated'], authenticateToken, userController.FindSeparated);
router.get(['/getbyrm/:id', '/user/getbyrm/:id', '/user/getreportingmanager', '/getreportingmanager'], authenticateToken, userController.findReportingManager);
router.post(['/fileupload', '/user/fileupload'], upload.single('file'), authenticateToken, userController.fileUpload);
router.delete(['/filedelete', '/user/filedelete'], authenticateToken, userController.fileDelete);
router.delete(['/filedeletebyurl', '/user/filedeletebyurl'], authenticateToken, userController.fileDeleteByURL);
router.get(['/underprobation', '/user/underprobation'], authenticateToken, userController.underProbation);
router.get(['/confirmed', '/user/confirmed'], authenticateToken, userController.confirmed);
router.all(['/confirmemployee/:id', '/user/confirmemployee/:id'], authenticateToken, userController.confirmEmployee);
router.get(['/export/all', '/user/export/all'], authenticateToken, userController.exportAllEmployees);
router.get(['/export/single/:id', '/user/export/single/:id'], authenticateToken, userController.exportSingleEmployee);
router.get('/', authenticateToken, userController.findTotalAllUsers);
router.patch(['/resignemployee/:id', '/user/resignemployee/:id'], authenticateToken, userController.resignEmployee);
router.patch(['/editnote/:id', '/user/editnote/:id'], authenticateToken, userController.editNote);

module.exports = router;