const express = require('express');
const router = express.Router();
const userDocumentController = require('../controllers/userDocument.controller');
const { authenticateToken } = require('../middlewares/auth');
const upload = require('../utils/userImageMulter');

router.post(['/fileupload', '/document/fileupload'], upload.single('file'), authenticateToken, userDocumentController.fileUpload);
router.post(['/add', '/document/add'], authenticateToken, userDocumentController.add);
router.get(['/findbyuser/:id', '/document/findbyuser/:id'], authenticateToken, userDocumentController.findByUserId);
router.patch(['/update/:id', '/document/update/:id'], authenticateToken, userDocumentController.update);
router.delete(['/delete/:id', '/document/delete/:id'], authenticateToken, userDocumentController.delete);
router.delete(['/filedelete', '/document/filedelete'], authenticateToken, userDocumentController.fileDelete);
router.delete(['/filedeletebyurl', '/document/filedeletebyurl'], authenticateToken, userDocumentController.fileDeleteByURL);

module.exports = router;
