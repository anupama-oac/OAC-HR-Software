const Role = require('../models/role');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const UserPosition = require('../models/userPosition');
const User = require('../models/user');

exports.addDesignation = async (req, res) => {
  const designationName = req.body.designationName || req.body.roleName;
  const abbreviation = req.body.abbreviation;
  try {
    const role = new Role({
      roleName: designationName,
      abbreviation,
      status: req.body.status !== undefined ? req.body.status : true,
      department: req.body.department || null
    });
    await role.save();

    res.status(201).json({
      ...role.toJSON(),
      designationName: role.roleName
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.findDesignations = async (req, res) => {
  try {
    let whereClause = {};
    let limit;
    let offset;

    const hasPaging = req.query.pageSize && req.query.pageSize !== 'undefined' && req.query.page && req.query.page !== 'undefined';
    const hasSearch = req.query.search && req.query.search !== 'undefined' && req.query.search.trim() !== '';

    if (hasPaging) {
      limit = parseInt(req.query.pageSize, 10);
      offset = (parseInt(req.query.page, 10) - 1) * limit;
    }

    if (hasSearch) {
      const searchTerm = req.query.search.replace(/\s+/g, '').trim().toLowerCase();
      whereClause = {
        [Op.or]: [
          sequelize.where(
            sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('roleName'), ' ', '')),
            {
              [Op.like]: `%${searchTerm}%`
            }
          ),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('abbreviation'), ' ', '')),
            {
              [Op.like]: `%${searchTerm}%`
            }
          )
        ]
      };
    }

    const roles = await Role.findAll({
      order: [['id', 'ASC']],
      limit,
      offset,
      where: whereClause
    });

    const totalCount = await Role.count({ where: whereClause });

    // Ensure both roleName and designationName are present on each item
    const items = roles.map(r => ({
      ...r.toJSON(),
      designationName: r.roleName
    }));

    if (hasPaging) {
      res.json({
        count: totalCount,
        items: items
      });
    } else {
      res.json(items);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateDesignation = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }

    if (req.body.designationName || req.body.roleName) {
      role.roleName = req.body.designationName || req.body.roleName;
    }
    if (req.body.abbreviation) {
      role.abbreviation = req.body.abbreviation;
    }
    if (req.body.status !== undefined) {
      role.status = req.body.status;
    }
    await role.save();

    res.json({
      ...role.toJSON(),
      designationName: role.roleName
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.deleteDesignation = async (req, res) => {
  try {
    const result = await Role.destroy({
      where: { id: req.params.id }
    });

    if (result === 0) {
      return res.status(404).json({
        status: "fail",
        message: "Designation with that ID not found",
      });
    }

    res.status(204).json();
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.getDesignationsByRoleId = async (req, res) => {
  try {
    const roles = await Role.findAll({ order: [['id', 'ASC']] });
    res.json(roles.map(r => ({
      ...r.toJSON(),
      designationName: r.roleName
    })));
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.getInternalUserByDesignation = async (req, res) => {
  try {
    const { designationName } = req.params;
    const formattedName = designationName.replace('-', ' ');

    const role = await Role.findOne({
      where: {
        [Op.or]: [
          { roleName: formattedName },
          { abbreviation: formattedName }
        ]
      }
    });

    const user = await User.findOne({
      where: role ? { roleId: role.id } : { name: formattedName },
      include: [{ model: UserPosition, as: 'userPosition' }]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: `No user found with designation: ${formattedName}` });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Internal Designation Fetch Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};




