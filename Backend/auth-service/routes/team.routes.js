const express = require('express');
const router = express.Router();
const teamController = require('../controllers/team.controller');
const { authenticateToken } = require('../middlewares/auth');

router.post(['/', '/add', '/create'], authenticateToken, teamController.createTeam);

router.get('/internal/user/:userId/team-leader', teamController.getInternalTeamLeaderByUserId);
  
router.get(['/', '/all', '/find'], authenticateToken, teamController.getTeams);

router.get('/:id', authenticateToken, teamController.getTeamById);

router.get('/leader/:id', authenticateToken, teamController.getTeamByLeaderId);

router.patch(['/:id', '/update/:id'], authenticateToken, teamController.updateTeam);

router.delete(['/:id', '/delete/:id'], authenticateToken, teamController.deleteTeam);
// GET /api/teams/leader/:userId/members
router.get('/leader/:userId/members', authenticateToken, teamController.getTeamMembersByLeader);

router.get('/:id/members', authenticateToken, teamController.getTeamMembersByTeam);

module.exports = router;