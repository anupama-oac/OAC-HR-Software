const express = require('express');
const router = express.Router();
const upload = require('../utils/userImageMulter');
const announcementController = require('../controllers/announcement.controller');

router.post('/add', announcementController.add);
router.get('/find', announcementController.findAll);
router.delete('/delete/:id', announcementController.delete);
router.post('/fileupload', upload.single('file'), announcementController.fileUpload);
router.delete('/filedelete', announcementController.fileDelete);
router.delete('/filedeletebyurl', announcementController.fileDeleteByUrl);

module.exports = router;
