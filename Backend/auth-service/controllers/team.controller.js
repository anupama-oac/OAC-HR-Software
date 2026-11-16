const { Team, TeamLeader, TeamMember, User } = require('../models');

const formatTeam = (teamInstance) => {
  if (!teamInstance) return null;
  const data = teamInstance.toJSON ? teamInstance.toJSON() : teamInstance;
  const rawLeaders = data.TeamLeaders || data.team_leaders || data.teamLeaders || [];
  const rawMembers = data.TeamMembers || data.team_members || data.teamMembers || [];

  const leaders = rawLeaders.map(l => ({
    ...l,
    user: l.User || l.user || null
  }));

  const members = rawMembers.map(m => ({
    ...m,
    user: m.User || m.user || null
  }));

  return {
    ...data,
    TeamLeaders: leaders,
    teamLeaders: leaders,
    team_leaders: leaders,
    TeamMembers: members,
    teamMembers: members,
    team_members: members
  };
};

exports.createTeam = async (req, res) => {
  try {
    const { teamName, teamLeaders, teamMembers } = req.body;
    
    // Validate input
    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    
    const team = await Team.create({ 
      teamName: teamName.trim()
    });
    
    // Create team leaders
    if (teamLeaders && teamLeaders.length > 0) {
      const teamLeaderRecords = teamLeaders.map(userId => ({
        teamId: team.id,
        userId: typeof userId === 'object' ? (userId.userId || userId.id) : userId
      }));
      await TeamLeader.bulkCreate(teamLeaderRecords);
    }
    
    // Create team members
    if (teamMembers && teamMembers.length > 0) {
      const teamMemberRecords = teamMembers.map(userId => ({
        teamId: team.id,
        userId: typeof userId === 'object' ? (userId.userId || userId.id) : userId
      }));
      await TeamMember.bulkCreate(teamMemberRecords);
    }
    
    // Fetch created team with relationships
    const createdTeam = await Team.findByPk(team.id, {
      include: [
        { 
          model: TeamLeader,
          include: [{ model: User, attributes: ['id', 'name', 'email', 'empNo'] }]
        },
        { 
          model: TeamMember,
          include: [{ model: User, attributes: ['id', 'name', 'email', 'empNo'] }]
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: formatTeam(createdTeam)
    });
    
  } catch (error) {
    // Handle specific errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(err => err.message)
      });
    }
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID provided',
        message: 'One or more users do not exist'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getTeams = async (req, res) => {
    try {
        const teams = await Team.findAll({
            include: [
                { model: TeamLeader, include: [{ model: User, attributes: ['id', 'name', 'email', 'empNo'] }] },
                { model: TeamMember, include: [{ model: User, attributes: ['id', 'name', 'email', 'empNo'] }] }
            ],
            order: [['id', 'DESC']]
        });
        
        res.json(teams.map(formatTeam));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getTeamById = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findOne({
      where: { id },
      include: [
        {
          model: TeamLeader,
          include: [{ model: User, attributes: ['id', 'name', 'email', 'empNo'] }]
        },
        {
          model: TeamMember,
          include: [{ model: User, attributes: ['id', 'name', 'email', 'empNo'] }]
        }
      ]
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json(formatTeam(team));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team',
      error: error.message
    });
  }
};

exports.getTeamByLeaderId = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await TeamLeader.findOne({
      where: { userId: id },
      include: [
        {
          model: Team,
          attributes: ['id'],
        },
      ]
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json(team);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team',
      error: error.message
    });
  }
};

exports.updateTeam = async (req, res) => {
    try {
        const { teamName, teamLeaders, teamMembers } = req.body;

        if (!teamName || !teamName.trim()) {
            return res.status(400).json({ error: 'Team name is required' });
        }

        const team = await Team.findByPk(req.params.id);
        if (!team) {
            return res.status(404).json({
                message: `Team with id=${req.params.id} was not found!`
            });
        }

        await team.update({ teamName: teamName.trim() });

        if (Array.isArray(teamLeaders)) {
            await TeamLeader.destroy({ where: { teamId: req.params.id } });
            if (teamLeaders.length > 0) {
                const teamLeaderRecords = teamLeaders.map(userId => ({
                    teamId: req.params.id,
                    userId: typeof userId === 'object' ? (userId.userId || userId.id) : userId
                }));
                await TeamLeader.bulkCreate(teamLeaderRecords);
            }
        }

        if (Array.isArray(teamMembers)) {
            await TeamMember.destroy({ where: { teamId: req.params.id } });
            if (teamMembers.length > 0) {
                const teamMemberRecords = teamMembers.map(userId => ({
                    teamId: req.params.id,
                    userId: typeof userId === 'object' ? (userId.userId || userId.id) : userId
                }));
                await TeamMember.bulkCreate(teamMemberRecords);
            }
        }

        const updatedTeam = await Team.findByPk(req.params.id, {
            include: [
                {
                    model: TeamLeader,
                    include: [{ model: User, attributes: ['id', 'name', 'email', 'empNo'] }]
                },
                {
                    model: TeamMember,
                    include: [{ model: User, attributes: ['id', 'name', 'email', 'empNo'] }]
                }
            ]
        });

        return res.json({
            success: true,
            message: "Team updated successfully.",
            data: formatTeam(updatedTeam)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.deleteTeam = async (req, res) => {
    try {
        const id = req.params.id;

        await TeamLeader.destroy({ where: { teamId: id } });
        await TeamMember.destroy({ where: { teamId: id } });

        const deleted = await Team.destroy({
            where: { id }
        });

        if (!deleted) {
            return res.status(404).json({
                status: "fail",
                message: "Team with that ID not found"
            });
        }

        return res.status(204).json();
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

exports.getTeamMembersByLeader = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1️⃣ Get teams where user is a LEADER
    const leaderTeams = await TeamLeader.findAll({
      where: { userId },
      attributes: ['teamId']
    });

    // 2️⃣ Get teams where user is a MEMBER
    const memberTeams = await TeamMember.findAll({
      where: { userId },
      attributes: ['teamId']
    });

    // 3️⃣ Combine teamIds (remove duplicates)
    const teamIds = [
      ...new Set([
        ...leaderTeams.map(t => t.teamId),
        ...memberTeams.map(t => t.teamId)
      ])
    ];
    
    if (!teamIds.length) {
      return res.json({
        success: true,
        teamIds: [],
        userIds: []
      });
    }

    // 4️⃣ Fetch all members from those teams
    const members = await TeamMember.findAll({
      where: { teamId: teamIds },
      attributes: ['userId']
    });
    // 5️⃣ Include leaders also (optional but recommended)
    const leaders = await TeamLeader.findAll({
      where: { teamId: teamIds },
      attributes: ['userId']
    });

    // 6️⃣ Merge users (members + leaders)
    const userIds = [
      ...new Set([
        ...members.map(m => m.userId),
        ...leaders.map(l => l.userId)
      ])
    ];

    return res.json({
      success: true,
      teamIds,
      userIds
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch team members'
    });
  }
};

exports.getTeamMembersByTeam = async (req, res) => {
  try {
    const { id } = req.params;
    // 1️⃣ Get teams where user is a LEADER
    const team = await Team.findByPk(id, {
      include: [
        {
          model: TeamLeader,
          include: [User]
        },
        {
          model: TeamMember,
          include: [User]
        }
      ]
    });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    // 🔹 Extract leaders
    const leaders = team.TeamLeaders.map(tl => ({
      ...tl.user.get({ plain: true }),
      role: 'LEADER'
    }));

    // 🔹 Extract members
    const members = team.TeamMembers.map(tm => ({
      ...tm.user.get({ plain: true }),
      role: 'MEMBER'
    }));

    // 🔹 Merge both arrays
    const teamMembers = [...leaders, ...members];
    return res.status(200).json({
      success: true,
      teamId: team.id,
      members: teamMembers
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch team members'
    });
  }
};



exports.getInternalTeamLeaderByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Find the team this user belongs to
    const memberRecord = await TeamMember.findOne({ where: { userId } });
    if (!memberRecord) {
      return res.status(404).json({ success: false, message: "User is not mapped to any team." });
    }

    // 2. Find the team leader for that specific team
    const leaderRecord = await TeamLeader.findOne({ where: { teamId: memberRecord.teamId } });
    if (!leaderRecord) {
      return res.status(404).json({ success: false, message: "No leader assigned to this user's team." });
    }

    // Return the leader's userId back to the Leave Service
    return res.status(200).json({ 
      success: true, 
      leaderUserId: leaderRecord.userId 
    });
    
  } catch (error) {
    console.error("Internal Team Leader Fetch Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};