const Designation = require('../models/designation');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const UserPosition = require('../models/userPosition');
const User = require('../models/user');
const Role = require('../models/role');

exports.addDesignation = async (req, res) => {
  const { designationName, abbreviation } = req.body;
  try {
    const role = new Designation({ designationName, abbreviation, roleId: null });
    await role.save();

    res.send(role);
  } catch (error) {
    res.status(500).send(error.message);
  }
}

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
            sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('designationName'), ' ', '')),
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

    const role = await Designation.findAll({
      order: [['id', 'ASC']],
      limit,
      offset,
      where: whereClause
    });

    const totalCount = await Designation.count({ where: whereClause });

    if (hasPaging) {
      const response = {
        count: totalCount,
        items: role,
      };

      res.json(response);
    }
    else {
      const filteredRoles = role.filter(r =>
        r.designationName !== 'SUPER ADMIN' && r.designationName !== 'APPROVAL ADMIN' && r.designationName !== 'HR ADMIN'
      );
      res.json(filteredRoles);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

exports.updateDesignation = async (req, res) => {
  try {
    const designation = await Designation.findByPk(req.params.id);
    if (!designation) {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }

    designation.designationName = req.body.designationName;
    designation.abbreviation = req.body.abbreviation;
    await designation.save();

    res.send(designation);
  } catch (error) {
    res.status(500).send(error.message);
  }
}

exports.deleteDesignation = async (req, res) => {
  try {
    const result = await Designation.destroy({
      where: { id: req.params.id },
      force: true,
    });

    if (result === 0) {
      return res.status(404).json({
        status: "fail",
        message: "Role with that ID not found",
      });
    }

    res.status(204).json();
  } catch (error) {
    res.send(error.message);
  }

}

exports.getDesignationsByRoleId = async (req, res) => {
  try {
    const role = await Designation.findAll({ where: { roleId: req.params.id } });

    res.send(role);
  } catch (error) {
    res.send(error.message);
  }
}


exports.getInternalUserByDesignation = async (req, res) => {
  try {
    const { designationName } = req.params;

    // Replace hyphens with spaces if passed as 'OPERATIONS-MANAGER'
    const formattedDesignation = designationName.replace('-', ' ');

    // Query your DB. Find the user assigned to this designation
    const user = await User.findOne({
      where: { designation: formattedDesignation },
      include: [{ model: UserPosition, as: 'userPosition' }] // Include relation if officialMail lives there
    });

    if (!user) {
      return res.status(404).json({ success: false, message: `No user found with designation: ${formattedDesignation}` });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Internal Designation Fetch Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};




