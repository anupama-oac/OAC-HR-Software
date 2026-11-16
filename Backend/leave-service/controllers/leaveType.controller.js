const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth');
const LeaveType = require('../models/leaveType');
const { Op, fn, col, where } = require('sequelize');
const { sequelize } = require('../config/database');



exports.createLeaveType = async (req, res) => {
  try {
    const { leaveTypeName } = req.body;
    if (!leaveTypeName || !leaveTypeName.trim()) {
      return res.status(400).json({ message: 'Leave type name is required' });
    }

    const trimmedName = leaveTypeName.trim();
    const existingLeaveType = await LeaveType.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('leaveTypeName')),
        trimmedName.toLowerCase()
      )
    });

    if (existingLeaveType) {
      return res.status(400).json({ message: `Leave type '${trimmedName}' already exists` });
    }

    const leaveType = await LeaveType.create({ leaveTypeName: trimmedName });
    return res.status(201).json({
      message: 'Leave type created successfully',
      leaveType
    });
  } catch (error) {
    console.error('Error creating leave type:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.findAll({
      order: [['leaveTypeName', 'ASC']]
    });
    return res.status(200).json(leaveTypes);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.PaginatedLeaveTypes = async (req, res) => {
  try {
    let whereClause = {};
    let limit;
    let offset;

    if (req.query.pageSize && req.query.pageSize !== 'undefined' && req.query.page && req.query.page !== 'undefined') {
      limit = parseInt(req.query.pageSize, 10);
      offset = (parseInt(req.query.page, 10) - 1) * limit;
    }

    if (req.query.search && req.query.search !== 'undefined' && req.query.search.trim()) {
      const searchTerm = req.query.search.replace(/\s+/g, '').trim().toLowerCase();
      whereClause = {
        [Op.or]: [
          sequelize.where(
            sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('leaveTypeName'), ' ', '')),
            {
              [Op.like]: `%${searchTerm}%`
            }
          )
        ]
      };
    }

    const customOrder = sequelize.literal(`
      CASE 
        WHEN "leaveTypeName" = 'Casual Leave' THEN 1
        WHEN "leaveTypeName" = 'Sick Leave' THEN 2
        WHEN "leaveTypeName" = 'Comp Off' THEN 3
        WHEN "leaveTypeName" = 'LOP' THEN 4
        ELSE 5
      END
    `);

    const leaveType = await LeaveType.findAll({
      order: [[customOrder, 'ASC'], ['leaveTypeName', 'ASC']],
      limit,
      offset,
      where: whereClause
    });

    const totalCount = await LeaveType.count({ where: whereClause });

    if (req.query.page && req.query.page !== 'undefined' && req.query.pageSize && req.query.pageSize !== 'undefined') {
      return res.json({
        count: totalCount,
        items: leaveType,
      });
    } else {
      return res.json(leaveType);
    }
  } catch (error) {
    console.error('Error fetching paginated leave types:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteLeaveType = async (req, res) => {
  try {
    const leaveTypeId = parseInt(req.params.id, 10);
    const leaveType = await LeaveType.findByPk(leaveTypeId);

    if (!leaveType) {
      return res.status(404).json({ message: 'Leave type not found' });
    }

    // Protect core system leave types
    const protectedTypes = ['Casual Leave', 'Sick Leave', 'Comp Off', 'LOP', 'Maternity Leave'];
    if (protectedTypes.includes(leaveType.leaveTypeName)) {
      return res.status(400).json({
        message: `'${leaveType.leaveTypeName}' is a core system leave type and cannot be deleted.`
      });
    }

    await LeaveType.destroy({
      where: { id: leaveTypeId },
      force: true
    });

    return res.json({ message: 'Leave type deleted successfully' });
  } catch (error) {
    console.error('Error deleting leave type:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.updateLeaveType = async (req, res) => {
  try {
    const leaveTypeId = parseInt(req.params.id, 10);
    const { leaveTypeName } = req.body;

    if (!leaveTypeName || !leaveTypeName.trim()) {
      return res.status(400).json({ message: 'Leave type name is required' });
    }

    const trimmedName = leaveTypeName.trim();

    const leaveType = await LeaveType.findByPk(leaveTypeId);
    if (!leaveType) {
      return res.status(404).json({ message: `Leave type with id ${leaveTypeId} not found` });
    }

    // Check duplicate name on another record
    const duplicate = await LeaveType.findOne({
      where: {
        id: { [Op.ne]: leaveTypeId },
        [Op.and]: [
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('leaveTypeName')),
            trimmedName.toLowerCase()
          )
        ]
      }
    });

    if (duplicate) {
      return res.status(400).json({ message: `Another leave type with name '${trimmedName}' already exists` });
    }

    leaveType.leaveTypeName = trimmedName;
    await leaveType.save();

    return res.json({
      message: 'Leave type updated successfully',
      leaveType
    });
  } catch (error) {
    console.error('Error updating leave type:', error);
    return res.status(500).json({ message: error.message });
  }
};


