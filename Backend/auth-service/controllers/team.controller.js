const { Team, TeamLeader, TeamMember, User } = require('../models');

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
        userId
      }));
      await TeamLeader.bulkCreate(teamLeaderRecords);
    }
    
    // Create team members
    if (teamMembers && teamMembers.length > 0) {
      const teamMemberRecords = teamMembers.map(userId => ({
        teamId: team.id,
        userId
      }));
      await TeamMember.bulkCreate(teamMemberRecords);
    }
    
    // Fetch created team with relationships
    const createdTeam = await Team.findByPk(team.id, {
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
    
    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: createdTeam
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
}

exports.getTeams = async (req, res) => {
    try {
        const team = await Team.findAll({include: [
            { model: TeamLeader, attributes: ['userId'], include: [{model: User, attributes: ['name']}] },
            { model: TeamMember, attributes: ['userId'], include: [{model: User, attributes: ['name']}] }]
        });
        
        res.send(team);
    } catch (error) {
        res.send(error.message)
    }
}

exports.getTeamById = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findOne({
      where: { id },
      include: [
        {
          model: TeamLeader,
          attributes: ['userId'],
          include: [
            {
              model: User,
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: TeamMember,
          attributes: ['userId'],
          include: [
            {
              model: User,
              attributes: ['id', 'name']
            }
          ]
        }
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

        const [num] = await Team.update(
            { teamName: teamName.trim() },
            { where: { id: req.params.id } }
        );

        if (num !== 1) {
            return res.status(404).json({
                message: `Cannot update Team with id=${req.params.id}. Maybe Team was not found or req.body is empty!`
            });
        }

        if (Array.isArray(teamLeaders)) {
            await TeamLeader.destroy({ where: { teamId: req.params.id } });
            if (teamLeaders.length > 0) {
                const teamLeaderRecords = teamLeaders.map(userId => ({
                    teamId: req.params.id,
                    userId
                }));
                await TeamLeader.bulkCreate(teamLeaderRecords);
            }
        }

        if (Array.isArray(teamMembers)) {
            await TeamMember.destroy({ where: { teamId: req.params.id } });
            if (teamMembers.length > 0) {
                const teamMemberRecords = teamMembers.map(userId => ({
                    teamId: req.params.id,
                    userId
                }));
                await TeamMember.bulkCreate(teamMemberRecords);
            }
        }

        const updatedTeam = await Team.findByPk(req.params.id, {
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

        return res.json({
            success: true,
            message: "Team updated successfully.",
            data: updatedTeam
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

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