const express = require('express');
const router = express.Router();
const userPersonalController = require('../controllers/userPersonal.controller');
const { authenticateToken } = require('../middlewares/auth');

router.post(['/add', '/personal/add', '/userpersonal/add'], authenticateToken, userPersonalController.add);
router.get(['/find', '/personal/find', '/userpersonal/find'], authenticateToken, userPersonalController.getAll);
router.get(['/findbyuser/:id', '/personal/findbyuser/:id', '/userpersonal/findbyuser/:id'], authenticateToken, userPersonalController.findByUserId);
router.patch(['/update/:id', '/personal/update/:id', '/userpersonal/update/:id'], authenticateToken, userPersonalController.update);
router.get(['/birthdays', '/personal/birthdays'], authenticateToken, userPersonalController.birthdays);
router.get(['/joiningday', '/personal/joiningday'], authenticateToken, userPersonalController.joiningDays);
router.get(['/dueprobation', '/personal/dueprobation'], authenticateToken, userPersonalController.dueProbation);
router.get(['/wishes', '/personal/wishes'], authenticateToken, userPersonalController.getWishes);
router.post(['/wishes', '/personal/wishes'], authenticateToken, userPersonalController.saveWish);
router.delete(['/wishes/:id', '/personal/wishes/:id'], authenticateToken, userPersonalController.deleteWish);

// Direct param fallback for services like leave-service: GET /userpersonal/:id
router.get(['/userpersonal/:id', '/:id'], authenticateToken, userPersonalController.findByUserId);

module.exports = router;
