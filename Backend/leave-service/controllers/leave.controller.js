const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth');
const Leave = require('../models/leave');
const LeaveType = require('../models/leaveType');
const UserLeave = require('../models/userLeave');
const upload = require('../utils/leaveDocumentMulter');
const s3 = require('../utils/s3bucket');
const config = require('../utils/config');
const authService = require('../utils/authService');
const { where } = require('sequelize');
const { createNotification } = require('../utils/notificationService');
const { sendEmail } = require('../utils/emailService');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const UserEmail = require('../models/userEmail');
const { resolveHostname } = require('nodemailer/lib/shared');
// const TeamLeader = require('../../users/models/teamLeader');
// const Designation = require('../../users/models/designation');
// const TeamMember = require('../../users/models/teamMember');
const { User } = require('../../auth-service/models');

// --------------------------------------------------------LEAVE REQUESTING------------------------------------------------------------

exports.createEmployeeLeave = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      let { userId, leaveTypeId, startDate, endDate, notes, fileUrl, leaveDates, status } = req.body;

      if (!leaveTypeId || !startDate || !endDate || !leaveDates) {
        await transaction.rollback();
        return res.json({ message: 'Missing required fields' });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        await transaction.rollback();
        return res.json({ message: 'User not found' });
      }
      const leaveType = await LeaveType.findByPk(leaveTypeId, { transaction });
      if (!leaveType) {
        await transaction.rollback();
        return res.json({ message: 'Leave type not found' });
      }
      const isLOP = leaveType.leaveTypeName === 'LOP';
      // const isLOP = leaveType.leaveTypeName === 'LOP';

    // --- NEW VALIDATION: Prevent LOP if other balances exist ---
    if (isLOP) {
      const totalOtherBalance = await UserLeave.sum('leaveBalance', {
        where: {
          userId,
          leaveBalance: { [Op.gt]: 0 } // Using Sequelize Operators
        },
        transaction
      });

      if (totalOtherBalance > 0) {
        await transaction.rollback();
        return res.json({ 
          message: `You cannot apply for LOP because you still have other leave balance remaining.` 
        });
        //   return res.json({ 
        //   message: `You cannot apply for LOP because you still have ${totalOtherBalance} days of other leave balance remaining.` 
        // });
      }
    }
    // ---------------------------------------------------------

      // Group leave dates by year and calculate days
      const datesByYear = {};
      leaveDates.forEach(date => {
        const year = new Date(date.date).getFullYear();
        if (!datesByYear[year]) datesByYear[year] = [];
        datesByYear[year].push(date);
      });

      const noOfDaysByYear = {};
      let totalRequiredDays = 0;

      Object.keys(datesByYear).forEach(year => {
        let totalDays = 0;
        datesByYear[year].forEach(date => {
          if (date.session1 && date.session2) {
            totalDays += 1;
          } else if (date.session1 || date.session2) {
            totalDays += 0.5;
          }
        });
        noOfDaysByYear[year] = totalDays;
        totalRequiredDays += totalDays; 
      });

      let penaltyLOP = 0;
      const applicationDate = new Date();
      const leaveStartDate = new Date(startDate);
      const leaveEndDate = new Date(endDate); 

      const diffTime = applicationDate - leaveStartDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const isFriday = leaveEndDate.getDay() === 5;
      const penaltyThreshold = isFriday ? 4 : 3;

      // UPDATED CONDITION: Only apply penalty if it is NOT LOP
      if (!isLOP && diffDays >= penaltyThreshold) {
        penaltyLOP = totalRequiredDays;
        const type = leaveType.leaveTypeName;
        const penaltyTag = `[Penalty: ${totalRequiredDays} ${type} + ${penaltyLOP} LOP due to late application]`;
        notes = notes ? `${notes} ${penaltyTag}` : penaltyTag;
      }

      const userLeaves = new Map();
      for (const year of Object.keys(datesByYear)) {
        let userLeave = await UserLeave.findOne({
          where: { userId, leaveTypeId, year },
          transaction,
        });

        if (!userLeave) {
          userLeave = await UserLeave.create({
            userId,
            leaveTypeId,
            year,
            noOfDays: 0,
            leaveBalance: 0,
            takenLeaves: 0,
          }, { transaction });
        }

        userLeaves.set(year, {
          instance: userLeave,
          balance: userLeave.leaveBalance,
        });

        const requiredDays = noOfDaysByYear[year];
        if (userLeave.leaveBalance < requiredDays && !isLOP) {
          await transaction.rollback();
          return res.json({ message: `Insufficient leave balance for year ${year}` });
        }

        const pendingLeaves = await Leave.sum('noOfDays', {
          where: {
            userId,
            leaveTypeId,
            status: 'Requested',
          },
          transaction,
        });
        if (userLeave.leaveBalance < (pendingLeaves + requiredDays) && !isLOP) {
          await transaction.rollback();
          return res.json({
            message: `Insufficient leave balance. You have already applied for ${pendingLeaves} days of leave,
            and your current balance is ${userLeave.leaveBalance} days. 
            You need an additional ${requiredDays} days for this request.`
          });
        }
      }

      const leave = await Leave.create({
        userId,
        leaveTypeId,
        startDate,
        endDate,
        noOfDays: totalRequiredDays,
        penaltyLOP: penaltyLOP,
        notes,
        fileUrl,
        status: 'Requested',
        leaveDates,
      }, { transaction });

      const statusMsg = penaltyLOP > 0 
        ? `Success: ${totalRequiredDays} ${leaveType.leaveTypeName} + ${penaltyLOP} LOP (Late Penalty)`
        : "Leave processed successfully";

      const not = await handleNotificationsAndEmails(req, res, leave, transaction, 'employee', 'Create');
      await transaction.commit();
      res.json({
        not: not,
        message: statusMsg,
        leave,
      });

    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      res.json({ error: error.message });
    }
}

exports.removePenalty = async (req,res)=>{
  const leaveId = req.params.id;
  const transaction = await sequelize.transaction();

  try {
    // 1. Fetch the leave details
    const leave = await Leave.findByPk(leaveId, { transaction });

    if (!leave) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // 2. Reset the penalty value in the Leave table ONLY
    // We do NOT touch UserLeave.takenLeaves here.
    leave.penaltyLOP = 0;

    // 3. Clean up the notes so the "Penalty" text is gone
    if (leave.notes) {
      // Removes the [Penalty: ... ] block
      leave.notes = leave.notes.replace(/\[Penalty:.*?\]/gi, '').trim();
      leave.notes += " (Penalty Waived)";
    }

    await leave.save({ transaction });
    await transaction.commit();

    res.json({
      message: "Penalty reset to 0 successfully. Approval will not include LOP penalty.",
      leave
    });

  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Reset Error:', error);
    res.status(500).json({ error: error.message });
  }
}

exports.removeApprovedPenalty = async(req,res)=>{
  const leaveId = req.params.id;
  const transaction = await sequelize.transaction();

  try {
    // 1. Fetch the leave details
    const leave = await Leave.findByPk(leaveId, { transaction });
    if (!leave) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Leave record not found' });
    }

    const penaltyAmount = parseFloat(leave.penaltyLOP) || 0;
    const leaveYear = new Date(leave.startDate).getFullYear();

    // 2. Find the LeaveType ID for 'LOP' dynamically
    const lopType = await LeaveType.findOne({ 
      where: { leaveTypeName: 'LOP' }, 
      transaction 
    });

    if (!lopType) {
      await transaction.rollback();
      return res.status(404).json({ message: 'LOP Leave Type not configured in database' });
    }

    // 3. Find the user's specific LOP row in userLeave table
    const userLopRecord = await UserLeave.findOne({ 
      where: { 
        userId: leave.userId,
        leaveTypeId: lopType.id, // Targets ONLY the LOP row
        year: leaveYear 
      }, 
      transaction 
    });

    if (userLopRecord && penaltyAmount > 0) {
      // --- THE CORE DEDUCTION ---
      const oldTaken = parseFloat(userLopRecord.takenLeaves) || 0;
      userLopRecord.takenLeaves = Math.max(0, oldTaken - penaltyAmount);
      
      // Update balance (noOfDays - takenLeaves)
      userLopRecord.leaveBalance = (parseFloat(userLopRecord.noOfDays) || 0) - userLopRecord.takenLeaves;

      await userLopRecord.save({ transaction });

      // 4. Update Leave table (reset penalty to 0)
      leave.penaltyLOP = 0;
      if (leave.notes) {
        leave.notes = leave.notes.replace(/\[Penalty:.*?\]/gi, '').trim();
        leave.notes += " (Penalty Waived - LOP Count Reduced)";
      }
      await leave.save({ transaction });

      // Commit both updates
      await transaction.commit();

      res.json({ 
        message: "LOP Count Updated Successfully", 
        newTakenLeaves: userLopRecord.takenLeaves 
      });
    } else {
      await transaction.rollback();
      res.status(400).json({ message: "No LOP record found for this user to update." });
    }

  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("Deduction Error:", error);
    res.status(500).json({ error: error.message });
  }
}


exports.updateEmployeeLeave = async(req,res)=>{
 const transaction = await sequelize.transaction();
  try {
    const leaveId = req.params.id;
    const { userId, leaveTypeId, leaveDates, notes, fileUrl, startDate, endDate } = req.body;

    // Validate required fields
    if (!userId || !leaveTypeId || !leaveDates) {
      await transaction.rollback();
      return res.json({ message: 'Missing required fields: userId, leaveTypeId, and leaveDates are mandatory.' });
    }

    // Get existing leave
    const existingLeave = await Leave.findByPk(leaveId, { transaction });
    if (!existingLeave) {
      await transaction.rollback();
      return res.json({ message: `Leave not found with id=${leaveId}` });
    }

    // Check user and leave type
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.json({ message: 'User not found' });
    }

    const newLeaveType = await LeaveType.findByPk(leaveTypeId, { transaction });
    if (!newLeaveType) {
      await transaction.rollback();
      return res.json({ message: 'Leave type not found' });
    }

    const isLOP = newLeaveType.leaveTypeName === 'LOP';

    // Group new leave dates by year and calculate days
    const datesByYear = {};
    leaveDates.forEach(date => {
      const year = new Date(date.date).getFullYear();
      if (!datesByYear[year]) datesByYear[year] = [];
      datesByYear[year].push(date);
    });

    const noOfDaysByYear = {};
    Object.keys(datesByYear).forEach(year => {
      let totalDays = 0;
      datesByYear[year].forEach(date => {
        if (date.session1 !== undefined && date.session2 !== undefined) {
          if (date.session1 && date.session2) {
            totalDays += 1; // Full day leave
          } else if (date.session1 || date.session2) {
            totalDays += 0.5; // Half day leave
          }
        }
      });
      noOfDaysByYear[year] = totalDays;
    });

    // For update, we need to check if the new dates would exceed the balance
    // but we don't actually deduct the balance yet (that happens on approval)
    if (!isLOP) {
      for (const [year, days] of Object.entries(noOfDaysByYear)) {
        const userLeave = await UserLeave.findOne({
          where: { userId, leaveTypeId, year: parseInt(year) },
          transaction,
        });

        if (!userLeave) {
          await transaction.rollback();
          return res.json({ message: `No leave record found for year ${year}` });
        }

        // Calculate pending leaves for the user (excluding the current leave being updated)
        const pendingLeaves = await Leave.sum('noOfDays', {
          where: {
            userId,
            leaveTypeId,
            status: 'Requested',
            id: { [Op.ne]: leaveId } // Exclude current leave from pending calculation
          },
          transaction,
        });

        // Check if the updated leave request would exceed the available balance
        if (userLeave.leaveBalance < (pendingLeaves + days)) {
          await transaction.rollback();
          return res.json({
            message: `Insufficient leave balance. You have already applied for ${pendingLeaves} days of leave,
            and your current balance is ${userLeave.leaveBalance} days. 
            You need an additional ${days} days for this request.`
          });
        }
      }
    }

    // Update the leave record
    const updatedLeave = await existingLeave.update({
      userId,
      leaveTypeId,
      startDate,
      endDate,
      noOfDays: Object.values(noOfDaysByYear).reduce((a, b) => a + b, 0),
      notes,
      fileUrl,
      status: 'Requested',
      leaveDates,
    }, { transaction });

    // Send notifications and emails
    const not = await handleNotificationsAndEmails(req, res, updatedLeave, transaction, 'employee', 'Update');

    await transaction.commit();

    res.json({
      not: not,
      message: 'Leave updated successfully',
      leave: updatedLeave,
    });

  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    res.json({ message: error.message });
  }
}
// -----------------------------------------------------------GETBYUSERID-------------------------------------------------------------
exports.getLeavesByUserId = async(req,res)=>{

  try {
    const userId = req.params.userId;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.json({ message: 'User not found' });
    }

    let whereClause = {
      userId: userId,
      status: { [Op.ne]: 'Locked' } // Add this line to filter out 'Locked' status
    };
    let limit;
    let offset;

    if (req.query.pageSize && req.query.page && req.query.pageSize !== 'undefined' && req.query.page !== 'undefined') {
      limit = req.query.pageSize;
      offset = (req.query.page - 1) * req.query.pageSize;
    }
    if (req.query.search && req.query.search !== 'undefined') {
      const searchTerm = req.query.search.replace(/\s+/g, '').trim().toLowerCase();
      whereClause = {
        ...whereClause,
        [Op.or]: [
          sequelize.where(
            sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('leaveTypeName'), ' ', '')),
            { [Op.like]: `%${searchTerm}%` }
          ),
        ],
      };
    }

    const leave = await Leave.findAll({
      order: [['id', 'DESC']],
      limit,
      offset,
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['name', 'empNo'], required: true },
        { model: LeaveType, as: 'leaveType', attributes: ['id', 'leaveTypeName'] }
      ]
    });

    const totalCount = await Leave.count({ where: whereClause });

    if (req.query.page !== 'undefined' && req.query.pageSize !== 'undefined') {
      const response = {
        count: totalCount,
        items: leave,
      };
      res.json(response);
    } else {
      res.json(leave);
    }
  } catch (error) {
    res.send(error.message);
  }
}

exports.getLockedLeavesByUserId = async(req,res)=>{
  try {
    const userId = req.params.userId;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.json({ message: 'User not found' });
    }

    let whereClause = {
      userId: userId,
      status: 'Locked'
    };
    let limit;
    let offset;

    if (req.query.pageSize && req.query.page && req.query.pageSize !== 'undefined' && req.query.page !== 'undefined') {
      limit = req.query.pageSize;
      offset = (req.query.page - 1) * req.query.pageSize;
    }
    if (req.query.search && req.query.search !== 'undefined') {
      const searchTerm = req.query.search.replace(/\s+/g, '').trim().toLowerCase();
      whereClause = {
        ...whereClause,
        [Op.or]: [
          sequelize.where(
            sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('leaveTypeName'), ' ', '')),
            { [Op.like]: `%${searchTerm}%` }
          ),
        ],
      };
    }

    const leave = await Leave.findAll({
      order: [['id', 'DESC']],
      limit,
      offset,
      where: whereClause,
      include: [
        {
          model: LeaveType, as: 'leaveType',
          attributes: ['id', 'leaveTypeName'],
        }
      ]
    });

    const totalCount = await Leave.count({ where: whereClause });

    if (req.query.page !== 'undefined' && req.query.pageSize !== 'undefined') {
      const response = {
        count: totalCount,
        items: leave,
      };
      res.json(response);
    } else {
      res.json(leave);
    }
  } catch (error) {
    res.send(error.message);
  }
}

// -----------------------------------------------------------FOR DASHBOARD----------------------------------------------------------
exports.getRequestedLeaves = async(req,res)=>{
  try {
    let limit;
    let offset;

    if (typeof req.query.pageSize !== 'undefined' && typeof req.query.page !== 'undefined') {
      limit = parseInt(req.query.pageSize, 10);
      offset = (parseInt(req.query.page, 10) - 1) * limit;
    }
    const leave = await Leave.findAll({
      order: [['id', 'DESC']], where: { status: 'Requested' },
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name'],
          required: true,
        },
        {
          model: LeaveType,
          as: 'leaveType',
          attributes: ['leaveTypeName'],
          required: true,
        }
      ]
    });

    const totalCount = await Leave.count({ where: { status: 'Requested' } });

    if (typeof req.query.page !== 'undefined' && typeof req.query.pageSize !== 'undefined') {
      const response = {
        count: totalCount,
        items: leave,
      };
      res.json(response);
    } else {
      res.json(leave);
    }
  } catch (error) {
    res.send(error.message);
  }
}

// ------------------------------------------------------------GET ALL----------------------------------------------------------------------

exports.findAllLeaves = async(req,res)=>{
  try {
    let limit;
    let offset;

    if (typeof req.query.pageSize !== 'undefined' && typeof req.query.page !== 'undefined') {
      limit = parseInt(req.query.pageSize, 10);
      offset = (parseInt(req.query.page, 10) - 1) * limit;
    }

    let searchTerm;
    if (req.query.search !== undefined && req.query.search !== '') {
      searchTerm = req.query.search.replace(/\s+/g, '').trim().toLowerCase();
    }

    const leave = await Leave.findAll({
      order: [
        [sequelize.literal(`CASE WHEN "leave"."status" = 'Requested' THEN 0 ELSE 1 END`), 'ASC'], // Explicitly reference "Leave"."status"
        ['id', 'DESC'] // Then order by id in descending order
      ],
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'empNo'],
          required: true,
        },
        {
          model: LeaveType,
          as: 'leaveType',
          attributes: ['leaveTypeName'],
          required: true,
        }
      ],
      where: {
        [Op.and]: [
          {
            status: {
              [Op.ne]: 'Locked' // Filter to exclude records where status is 'Locked'
            }
          },
          searchTerm
            ? {
              [Op.or]: [
                sequelize.where(
                  sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('user.name'), ' ', '')),
                  { [Op.like]: `%${searchTerm}%` }
                ),
                sequelize.where(
                  sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('leaveType.leaveTypeName'), ' ', '')),
                  { [Op.like]: `%${searchTerm}%` }
                )
              ]
            }
            : {}
        ]
      }
    });

    const totalCount = await Leave.count({
      where: {
        status: {
          [Op.ne]: 'Locked' // Ensure the count also respects the status filter
        }
      }
    });

    if (typeof req.query.page !== 'undefined' && typeof req.query.pageSize !== 'undefined') {
      const response = {
        count: totalCount,
        items: leave,
      };
      res.json(response);
    } else {
      res.json(leave);
    }
  } catch (error) {
    res.send(error.message);
  }
}

exports.findAllLockedLeaves = async(req,res)=>{
  try {
    let limit;
    let offset;

    if (typeof req.query.pageSize !== 'undefined' && typeof req.query.page !== 'undefined') {
      limit = parseInt(req.query.pageSize, 10);
      offset = (parseInt(req.query.page, 10) - 1) * limit;
    }

    let searchTerm;
    if (req.query.search !== undefined && req.query.search !== '') {
      searchTerm = req.query.search.replace(/\s+/g, '').trim().toLowerCase();
    }

    const leave = await Leave.findAll({
      order: [['id', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'empNo'],
          required: true,
        },
        {
          model: LeaveType,
          as: 'leaveType',
          attributes: ['leaveTypeName'],
          required: true,
        }
      ],
      where: {
        [Op.and]: [
          {
            status: 'Locked'
          },
          searchTerm
            ? {
              [Op.or]: [
                sequelize.where(
                  sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('user.name'), ' ', '')),
                  { [Op.like]: `%${searchTerm}%` }
                ),
                sequelize.where(
                  sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('leaveType.leaveTypeName'), ' ', '')),
                  { [Op.like]: `%${searchTerm}%` }
                )
              ]
            }
            : {}
        ]
      }
    });

    const totalCount = await Leave.count({
      where: {
        status: 'Locked'
      }
    });

    if (typeof req.query.page !== 'undefined' && typeof req.query.pageSize !== 'undefined') {
      const response = {
        count: totalCount,
        items: leave,
      };
      res.json(response);
    } else {
      res.json(leave);
    }
  } catch (error) {
    res.send(error.message);
  }
}

exports.getEmergencyLeaves = async(req,res)=>{
 const transaction = await sequelize.transaction();
  try {
    const { userId, leaveTypeId, startDate, endDate, notes, fileUrl, leaveDates, status } = req.body;

    // Validate required fields
    if (!userId || !leaveTypeId || !startDate || !endDate || !leaveDates) {
      await transaction.rollback();
      return res.json({ message: 'Missing required fields' });
    }

    // Fetch leave type
    const leaveType = await LeaveType.findOne({ where: { id: leaveTypeId }, transaction });
    if (!leaveType) {
      await transaction.rollback();
      return res.json({ message: 'Leave type not found' });
    }

    // Sort leaveDates by date
    const sortedLeaveDates = [...leaveDates].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group leave dates by year
    const datesByYear = new Map();
    for (const dateObj of sortedLeaveDates) {
      const dateYear = new Date(dateObj.date).getFullYear().toString();
      if (!datesByYear.has(dateYear)) {
        datesByYear.set(dateYear, []);
      }
      datesByYear.get(dateYear).push(dateObj);
    }

    // Track UserLeave balances and used days per year
    const userLeaves = new Map(); // { year: { instance, balance } }
    let totalBalanceDays = 0;

    // Check if the leave type is LOP
    const isLOP = leaveType.leaveTypeName === 'LOP';

    // Initialize leaves array to store created leave records
    let leaves;

    // Calculate required days for each date
    for (const [year, dates] of datesByYear) {
      let totalDays = 0;
      for (const dateObj of dates) {
        const requiredDays = await calculateDays(dateObj);
        totalDays += requiredDays;
      }

      // Initialize UserLeave for the current year
      let userLeave = await UserLeave.findOne({
        where: { userId, leaveTypeId, year },
        transaction,
      });

      if (!userLeave) {
        userLeave = await UserLeave.create({
          userId,
          leaveTypeId,
          year,
          noOfDays: 0,
          leaveBalance: 0,
          takenLeaves: 0,
        }, { transaction });
      }

      userLeaves.set(year, {
        instance: userLeave,
        balance: userLeave.leaveBalance,
      });

      // Check if the balance is sufficient
      if (userLeave.leaveBalance < totalDays && !isLOP) {
        await transaction.rollback();
        return res.json({ message: `Insufficient leave balance for year ${year}` });
      }

      const pendingLeaves = await Leave.sum('noOfDays', {
        where: {
          userId,
          leaveTypeId,
          status: 'Requested',
        },
        transaction,
      });

      // Check if the balance is sufficient, including pending leaves
      if (userLeave.leaveBalance < (pendingLeaves + totalDays) && !isLOP) {
        await transaction.rollback();
        return res.json({
          message: `Insufficient leave balance for year ${year}. 
          employee have already applied for ${pendingLeaves} days of leave,
          and employees current balance is ${userLeave.leaveBalance} days. 
          You need an additional ${totalDays} days for this request.`,
        });
      }

      totalBalanceDays += totalDays;
    }

    // Create leave records for each year
    for (const [year, dates] of datesByYear) {
      const { instance: userLeave } = userLeaves.get(year);
      userLeave.takenLeaves += totalBalanceDays;
      if (!isLOP) {
        userLeave.leaveBalance -= totalBalanceDays;
      }
      await userLeave.save({ transaction });

      // Create leave record for this year
      const leave = await createLeaveRecord({
        userId,
        leaveTypeId,
        dates: dates,
        notes: notes,
        fileUrl,
        status,
        transaction,
      });
      leaves = leave
    }

    // Prepare leaveDetails for response
    const leaveDetails = [];
    for (const [year, { instance: userLeave }] of userLeaves) {
      leaveDetails.push({
        year,
        balanceUsed: totalBalanceDays,
        balanceLeaves: userLeave.leaveBalance,
        leaveType: leaveType.leaveTypeName
      });
    }

    // Commit transaction and send response
    const not = await handleNotificationsAndEmails(req, res, leaves, transaction, 'emergency', 'Create');
    await transaction.commit();
    res.json({
      not: not,
      message: 'Leave processed successfully',
      totalBalanceDays,
      leaves, // Include the created leave records in the response
      details: leaveDetails // Include leave details in the response
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    res.json({ message: error.message });
  }
}
exports.updateEmergencyLeave = async(req,res)=>{
const transaction = await sequelize.transaction();
  try {
    const { userId, leaveTypeId, startDate, endDate, notes, fileUrl, leaveDates, status } = req.body;

    // Validate required fields
    if (!userId || !leaveTypeId || !startDate || !endDate || !leaveDates) {
      await transaction.rollback();
      return res.json({ message: 'Missing required fields' });
    }

    // Fetch leave type within transaction
    const leaveType = await LeaveType.findOne({ where: { id: leaveTypeId }, transaction });

    if (!leaveType) {
      await transaction.rollback();
      return res.json({ message: 'Leave type not found' });
    }

    // Fetch existing leave record
    const existingLeave = await Leave.findByPk(req.params.id, { transaction });

    if (!existingLeave) {
      await transaction.rollback();
      return res.json({ message: 'Leave record not found' });
    }

    // Check if we need to revert previous balance (only if it was approved)
    const shouldRevertPrevious = ['Approved', 'AdminApproved'].includes(existingLeave.status);
    if (shouldRevertPrevious) {
      const oldYear = new Date(existingLeave.startDate).getFullYear().toString();
      const oldUL = await UserLeave.findOne({
        where: {
          userId: existingLeave.userId,
          leaveTypeId: existingLeave.leaveTypeId,
          year: oldYear
        },
        transaction,
      });
      if (oldUL) {
        // Revert the old leave balance
        oldUL.takenLeaves -= existingLeave.noOfDays;
        oldUL.leaveBalance += existingLeave.noOfDays;
        await oldUL.save({ transaction });
      }
    }

    // Sort leaveDates by date
    const sortedLeaveDates = [...leaveDates].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group leave dates by year
    const datesByYear = new Map();
    for (const dateObj of sortedLeaveDates) {
      const dateYear = new Date(dateObj.date).getFullYear().toString();
      if (!datesByYear.has(dateYear)) {
        datesByYear.set(dateYear, []);
      }
      datesByYear.get(dateYear).push(dateObj);
    }

    // Track UserLeave balances per year
    const userLeaves = new Map();

    // Check if the leave type is LOP
    const isLOP = leaveType.leaveTypeName === 'LOP';

    // Calculate required days for each year and check balance
    // for (const [year, dates] of datesByYear) {
    //   let totalDays = 0;
    //   for (const dateObj of dates) {
    //     const requiredDays = await calculateDays(dateObj);
    //     totalDays += requiredDays;
    //   }

    //   // Get or create UserLeave for the year
    //   let userLeave = await UserLeave.findOne({
    //     where: { userId, leaveTypeId, year },
    //     transaction,
    //   });
    //   console.log(userLeave,"6666666666666");

    //   if (!userLeave) {
    //     userLeave = await UserLeave.create({
    //       userId,
    //       leaveTypeId,
    //       year,
    //       noOfDays: 0,
    //       leaveBalance: 0,
    //       takenLeaves: 0,
    //     }, { transaction });
    //   }

    //   userLeaves.set(year, {
    //     instance: userLeave,
    //     balance: userLeave.leaveBalance,
    //     days: totalDays
    //   });
    //   console.log(userLeaves);

    //   // Calculate pending leaves for the user (excluding current leave if it was pending)
    //   const pendingWhere = {
    //     userId,
    //     leaveTypeId,
    //     status: 'Requested',
    //     id: { [Op.ne]: req.params.id } // Exclude current leave from pending calculation
    //   };

    //   const pendingLeaves = await Leave.sum('noOfDays', {
    //     where: pendingWhere,
    //     transaction,
    //   });

    //   // Check if the balance is sufficient, including pending leaves
    //   if (userLeave.leaveBalance < (pendingLeaves + totalDays) && !isLOP) {
    //     await transaction.rollback();
    //     return res.json({
    //       message: `Insufficient leave balance for year ${year}. 
    //       Employee have already applied for ${pendingLeaves} days of leave,
    //       and employees current balance is ${userLeave.leaveBalance} days. 
    //       You need an additional ${totalDays} days for this request.`,
    //     });
    //   }
    // }

    // Update UserLeave records only if status is Approved/AdminApproved
    const shouldUpdateCounts = ['Approved', 'AdminApproved'].includes(status);

    if (shouldUpdateCounts) {
      for (const [year, { instance: userLeave, days }] of userLeaves) {
        userLeave.takenLeaves += days;
        if (!isLOP) {
          userLeave.leaveBalance -= days;
        }

        await userLeave.save({ transaction });
      }
    }

    // Update leave records
    const updatedLeave = await updateLeaveRecord({
      leaveId: req.params.id,
      userId,
      leaveTypeId,
      dates: sortedLeaveDates,
      notes,
      fileUrl,
      transaction,
    });

    // Send notifications and emails
    const not = await handleNotificationsAndEmails(req, res, updatedLeave, transaction, 'emergency', 'Update');

    // Commit transaction and send response
    await transaction.commit();
    res.json({
      leaves: [updatedLeave],
      not,
      message: 'Leave updated successfully',
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    res.json({ message: error.message });
  }
}

exports.getLeavesById = async (req, res) => {
  try {
    // 1. Fetch the leave record locally, excluding broken cross-service User joins
    const leave = await Leave.findByPk(req.params.id, {
      include: [
        {
          model: LeaveType,
          as: 'leaveType',
          attributes: ['id', 'leaveTypeName'],
        },
      ],
    });

    if (!leave) {
      return res.json({ message: `Leave not found` });
    }

    // 2. Fetch the user's reporting manager information from the auth microservice
    const managerContext = await authService.getUserWithReportingManager(leave.userId);

    // 3. Format the response object to preserve your front-end's expected data structure
    const leaveData = leave.toJSON();
    leaveData.user = {
      name: managerContext?.name || "Unknown Employee",
      userpersonal: {
        reportingMangerId: managerContext?.reportingManagerId || null
      }
    };

    return res.send(leaveData);
  } catch (error) {
    return res.send(error.message);
  }
};

async function getReportingManagerEmailForUser(userId) {
  try {
    // 1. Fetch user personal context via auth microservice wrapper
    const userPersonal = await authService.getUserPersonal(userId);
    if (!userPersonal) {
      return { email: `Personal details are not added` };
    }

    // Handle potential casing variations from the microservice response payload
    const reportingMangerId = userPersonal.reportingMangerId || userPersonal.reportingManagerId;
    if (!reportingMangerId) {
      return { email: `No reporting manager found for user ${userPersonal.name || userId}` };
    }

    // 2. Fetch manager's profile using the manager's ID to isolate their official email credentials
    const managerPersonal = await authService.getUserPersonal(reportingMangerId);
    
    // Check fallback targets inside the manager profile payload
    const officialMail = managerPersonal?.userPosition?.officialMailId || 
                         managerPersonal?.officialMailId || 
                         managerPersonal?.email;

    if (officialMail) {
      return { 
        email: officialMail, 
        name: managerPersonal.name || "Reporting Manager" 
      };
    } else {
      return { 
        email: `Official mail is not added for reportingManger ${managerPersonal?.name || reportingMangerId}` 
      };
    }
  } catch (error) {
    return { email: error.message };
  }
}

async function getRMId(userId) {
  try {
    // Leverage the updated helper to get reporting manager properties instantly
    const managerContext = await authService.getUserWithReportingManager(userId);
    
    if (!managerContext || !managerContext.reportingManagerId) {
      return `Reporting manager is not found`;
    }

    return managerContext.reportingManagerId;
  } catch (error) {
    return error.message;
  }
}


exports.deleteUntakenleave = async(req,res)=>{
let transaction;
  try {
    const leaveId = req.params.id;

    // Start a transaction to ensure atomicity
    transaction = await sequelize.transaction();

    const leave = await Leave.findByPk(leaveId, {
      include: {
        model: LeaveType,
        as: 'leaveType',
      },
      transaction, // Pass the transaction to the query
    });

    if (!leave) {
      await transaction.rollback(); // Rollback the transaction if leave is not found
      return res.send('Leave not found');
    }

    const leaveDays = leave.noOfDays;
    const key = leave.fileUrl;

    // Delete the file from S3 if it exists
    const fileKey = key ? key.replace(`https://approval-management-data-s3.s3.ap-south-1.amazonaws.com/`, '') : null;
    if (fileKey) {
      const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey
      };
      await s3.deleteObject(deleteParams).promise();
    }
    // Update UserLeave records if the leave status is 'Approved' or 'AdminApproved'
    if (leave.status === 'Approved' || leave.status === 'AdminApproved') {
      const leaveStartYear = new Date(leave.startDate).getFullYear();
      const leaveEndYear = new Date(leave.endDate).getFullYear();

      // If the leave spans multiple years, update UserLeave records for each year
      for (let year = leaveStartYear; year <= leaveEndYear; year++) {
        const userLeave = await UserLeave.findOne({
          where: {
            userId: leave.userId,
            leaveTypeId: leave.leaveTypeId,
            year: year // Assuming you have a 'year' field in UserLeave
          },
          transaction, // Pass the transaction to the query
        });

        if (userLeave) {
          if (leave.leaveType.leaveTypeName === 'LOP') {
            userLeave.takenLeaves -= leaveDays;
          } else {
            userLeave.takenLeaves -= leaveDays;
            userLeave.leaveBalance += leaveDays;
          }
          await userLeave.save({ transaction }); // Save with transaction
        }
      }

      // Handle notifications and emails for 'emergency' type
      await handleNotificationsAndEmails(req, res, leave, transaction, 'emergency', 'delete');
    } else {
      // Handle notifications and emails for 'employee' type
      await handleNotificationsAndEmails(req, res, leave, transaction, 'employee', 'delete');
    }

    // Delete the leave record
    await leave.destroy({ transaction });

    // Commit the transaction if everything is successful
    await transaction.commit();

    res.status(204).send('Leave deleted and balance updated successfully');
  } catch (error) {
    // Rollback the transaction in case of any error
    if (transaction) await transaction.rollback();
    res.status(500).send(error.message);
  }
}


exports.findMonthlyLeaveDays = async(req,res)=>{

try {
    const { startDate, endDate } = req.query; // Get startDate and endDate from query params

    if (!startDate || !endDate) {
      return res.send('startDate and endDate are required');
    }

    const data = await Leave.findAll({
      attributes: [
        'userId',
        [sequelize.fn('SUM', sequelize.literal(`
          CASE
            WHEN "startDate" < '${startDate}' AND "endDate" >= '${startDate}' THEN
              LEAST(EXTRACT(DAY FROM "endDate"::timestamp - '${startDate}'::timestamp) + 1, "noOfDays")
            WHEN "startDate" >= '${startDate}' AND "endDate" <= '${endDate}' THEN
              "noOfDays"
            WHEN "startDate" >= '${startDate}' AND "endDate" > '${endDate}' THEN
              LEAST(EXTRACT(DAY FROM '${endDate}'::timestamp - "startDate"::timestamp) + 1, "noOfDays")
            ELSE
              0
          END
        `)), 'totalLeaveDays']
      ],
      include: [
        {
          model: LeaveType,
          attributes: [],
          where: {
            leaveTypeName: 'LOP'
          }
        }
      ],
      where: {
        [Op.and]: [
          { startDate: { [Op.lte]: endDate } }, // Leave starts on or before endDate
          { endDate: { [Op.gte]: startDate } },
          { status: { [Op.in]: ['Approved', 'AdminApproved'] } }
        ]
      },
      group: ['userId'],
      raw: true,
    });
    res.send(data);
  } catch (error) {
    res.send(error.message);
  }
}



async function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0'); // getMonth() is zero-based
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

async function handleNotificationsAndEmails(req, res, leave, transaction, type, mes) {
  let message = [];
  
  // 1. Determine the correct target userId dynamically
  const targetUserId = req.body.userId ? req.body.userId : leave.userId;

  // 2. Fetch employment/position records via the Auth Microservice utility
  // Note: 'transaction' is omitted here since this is a network API call, not a local SQL query
  const userPos = await authService.getUserPosition(targetUserId);

  // 3. Handle missing profiles gracefully
  if (!userPos) {
    message.push('Employment details are not added for the employee');
    return message;
  }

  // Rest of your email/notification logic goes here...
  // Example: userPos.name or userPos.user?.name depending on how your microservice formats the return data.
  
  return message;
}

async function getHREmail() {
  try {
    // 1. Hit the external authentication microservice instead of querying local DB models
    const hrAdmin = await authService.getHRDetails();
    
    if (!hrAdmin) {
      return { mail: 'HR Admin user or role not found' };
    }

    // 2. Extract the official email address safely using fallback field pathways
    const officialMail = hrAdmin.officialMailId || 
                         hrAdmin.userPosition?.officialMailId || 
                         hrAdmin.mail || 
                         hrAdmin.email;

    if (!officialMail) {
      return { 
        mail: 'Official Mail Id not found for HR Admin', 
        name: hrAdmin.name || 'HR Administrator' 
      };
    }

    // 3. Return the exact structural contract to maintain backwards compatibility
    return { 
      mail: officialMail, 
      name: hrAdmin.name || 'HR Administrator' 
    };
    
  } catch (error) {
    return { mail: error.message };
  }
}

async function getOMEmail() {
  try {
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5000';

    // Update this URL to point precisely to your designation base route + our internal path
    // Example assuming base path is /api/designations
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/designations/internal/search/OPERATIONS-MANAGER`);
    
    const omUser = response.data.user;
    
    if (!omUser) {
      return 'Operational Manager user or role is not found';
    }

    // Safely extract the official email address
    const officialMail = omUser.userPosition?.officialMailId || 
                         omUser.officialMailId || 
                         omUser.email;

    if (!officialMail) {
      return `Official mail is not added for Operations Manager (${omUser.name || 'Unknown'})`;
    }

    return officialMail;
  } catch (error) {
    return error.response?.data?.message || error.message;
  }
}

async function getReportingManagerEmailForUser(userId) {
  try {
    // 1. Fetch user personal context via auth microservice wrapper
    const userPersonal = await authService.getUserPersonal(userId);
    if (!userPersonal) {
      return { email: `Personal details are not added` };
    }

    // Handle potential casing variations from the microservice response payload
    const reportingMangerId = userPersonal.reportingMangerId || userPersonal.reportingManagerId;
    if (!reportingMangerId) {
      return { email: `No reporting manager found for user ${userPersonal.name || userId}` };
    }

    // 2. Fetch manager's profile using the manager's ID to isolate their official email credentials
    const managerPersonal = await authService.getUserPersonal(reportingMangerId);
    
    // Check fallback targets inside the manager profile payload
    const officialMail = managerPersonal?.userPosition?.officialMailId || 
                         managerPersonal?.officialMailId || 
                         managerPersonal?.email;

    if (officialMail) {
      return { 
        email: officialMail, 
        name: managerPersonal.name || "Reporting Manager" 
      };
    } else {
      return { 
        email: `Official mail is not added for reportingManger ${managerPersonal?.name || reportingMangerId}` 
      };
    }
  } catch (error) {
    return { email: error.message };
  }
}

async function getTeamLeadEmails(userId) {
  try {
    // 1. Query the Auth Microservice for the employee's team layer records
    const teamContext = await authService.getTeamLeadsByUserId(userId);
    
    if (!teamContext) {
      return `No team layer details found for user with ID: ${userId}`;
    }

    const { teamId, teamLeads } = teamContext;

    if (!teamId) {
      return `User with ID ${userId} is not assigned to an active team context`;
    }

    if (!teamLeads || teamLeads.length === 0) {
      return `No team leads found for team with ID: ${teamId}`;
    }

    // 2. Map out the official email addresses, filtering out fallback null values safely
    const tlEmails = teamLeads
      .map(tl => tl.userPosition?.officialMailId || tl.officialMailId || tl.email)
      .filter(email => email);

    if (tlEmails.length === 0) {
      return "Official MailId is not added for TLs";
    }

    return tlEmails;
  } catch (error) {
    return error.message;
  }
}

async function getRMId(userId) {
  try {
    // Leverage the updated helper to get reporting manager properties instantly
    const managerContext = await authService.getUserWithReportingManager(userId);
    
    if (!managerContext || !managerContext.reportingManagerId) {
      return `Reporting manager is not found`;
    }

    return managerContext.reportingManagerId;
  } catch (error) {
    return error.message;
  }
}

async function getHRId() {
  try {
    const hrAdminRole = await Role.findOne({ where: { roleName: 'HR Administrator' } });
    if (!hrAdminRole) {
      return ('HR Admin role not found');
    }
    const hrAdminUser = await User.findOne({ where: { roleId: hrAdminRole.id, status: true } });
    if (!hrAdminUser) {
      return ('HR Admin user not found');
    }
    return hrAdminUser.id;
  } catch (error) {
    res.send(error.message)
  }
}

async function getTeamLeads(userId) {
  try {
    // 1. Fetch team structure context directly from the Auth Microservice wrapper
    const teamContext = await authService.getTeamLeadsByUserId(userId);
    
    if (!teamContext) {
      return `No team found for user with ID: ${userId}`;
    }

    const { teamLeads } = teamContext;

    if (!teamLeads || teamLeads.length === 0) {
      // Returning an empty array ensures loops iterating over IDs downstream won't break
      return []; 
    }

    // 2. Map out only the unique user IDs of the Team Leaders
    // We check common fallback positions depending on how your microservice nests user sub-objects
    const tlIds = teamLeads
      .map(tl => tl.id || tl.userId || tl.user?.id)
      .filter(id => id !== undefined && id !== null);

    return tlIds;
  } catch (error) {
    return error.message;
  }
}

async function calculateDays(dateObj) {
  return (dateObj.session1 ? 0.5 : 0) + (dateObj.session2 ? 0.5 : 0);
}

async function createLeaveRecord({ userId, leaveTypeId, dates, notes, fileUrl, status, transaction }) {
  if (dates.length === 0) return null;

  const sortedDates = dates.sort((a, b) => new Date(a.date) - new Date(b.date));

  const daysArray = await Promise.all(dates.map(date => calculateDays(date)));
  const noOfDays = daysArray.reduce((sum, days) => sum + days, 0);
  return await Leave.create({
    userId,
    leaveTypeId,
    startDate: sortedDates[0].date,
    endDate: sortedDates[sortedDates.length - 1].date,
    noOfDays: noOfDays,
    notes,
    fileUrl,
    status,
    leaveDates: dates,
  }, { transaction });
}

async function updateLeaveRecord({ leaveId, userId, leaveTypeId, dates, notes, fileUrl, transaction }) {
  const leave = await Leave.findByPk(leaveId, { transaction });
  if (!leave) throw new Error('Leave not found');

  // Get the old leave details
  // Calculate new leave details
  const daysArray = await Promise.all(dates.map(date => calculateDays(date)));
  const newNoOfDays = daysArray.reduce((sum, days) => sum + days, 0);
  const newYear = new Date(dates[0].date).getFullYear().toString();

  const newUL = await UserLeave.findOne({ where: { userId, leaveTypeId, year: newYear }, transaction });

  if (newUL) {
    newUL.takenLeaves += newNoOfDays;
    newUL.leaveBalance -= newNoOfDays;
    await newUL.save({ transaction });

  }

  // Update the leave record
  leave.userId = userId;
  leave.leaveTypeId = leaveTypeId;
  leave.startDate = dates[0].date;
  leave.endDate = dates[dates.length - 1].date;
  leave.noOfDays = newNoOfDays;
  leave.notes = notes;
  leave.fileUrl = fileUrl;
  leave.leaveDates = dates;

  await leave.save({ transaction });
  // Update UserLeave records
  // await updateUserLeaveRecords(userId, oldLeaveTypeId, leaveTypeId, oldNoOfDays, newNoOfDays, dates, transaction);

  return leave;
}


exports.getTotalLeaves = async(req,res)=>{
try {
    const leaves = await Leave.findAll({
      include: [
        {
          model: LeaveType, as: 'leaveType',
          attributes: ['id', 'leaveTypeName'],
        },
        {
          model: User, as: 'user',
          attributes: ['name']
        }
      ]
    });

    res.json(leaves);
  } catch (error) {
    res.json({ error: error.message });
  }
}


exports.fileUpload = async(req,res)=>{
// ------------------------------------------------FILE UPLOAD--------------------------------------------------------------------------
try {
    if (!req.file) {
      return res.send({ message: 'No file uploaded' });
    }

    const customFileName = req.body.name || req.file.originalname;
    const sanitizedFileName = customFileName.replace(/[^a-zA-Z0-9]/g, '_');

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `Leave/documents/${Date.now()}_${sanitizedFileName}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read'
    };

    const data = await s3.upload(params).promise();

    const fileUrl = data.Location ? data.Location : '';
    const key = fileUrl ? fileUrl.replace(`https://approval-management-data-s3.s3.ap-south-1.amazonaws.com/`, '') : null;

    res.send({
      message: 'File uploaded successfully',
      file: req.file,
      fileUrl: key
    });
  } catch (error) {
    res.send({ message: error.message });
  }
}

exports.updateLeaveFileUrl = async (req, res) => {
  try {
    const leaveId = req.params.leaveId;
    const fileUrl = req.body.fileUrl;

    if (!leaveId || !fileUrl) {
      return res.send({ message: 'Leave ID and File URL are required' });
    }

    // 1. Update the local Leave model with the incoming S3/File URL string
    const result = await Leave.update(
      { fileUrl: fileUrl },
      { where: { id: leaveId } }
    );

    if (result[0] === 0) {
      return res.send({ message: 'Leave request not found or already updated' });
    }

    const userId = req.user.id;
    const userName = req.user.name;

    // 2. Fetch HR details from the Auth service to keep workflow integrity
    const hrAdmin = await authService.getHRDetails();
    if (!hrAdmin) {
      return res.send({ message: 'HR Admin user or role not found' });
    }

    // 3. Retrieve the reporting manager configuration context using the auth service utility
    const userProfile = await authService.getUserWithReportingManager(userId);
    if (!userProfile || !userProfile.reportingManagerId) {
      return res.send({ message: `No reporting manager found for userId ${userId}` });
    }

    const reportingManagerId = userProfile.reportingManagerId;

    // 4. Construct payload properties and fire off the local notification emitter engine
    const id = reportingManagerId;
    const me = `Medical Certificate uploaded by ${userName} with id ${leaveId}`;
    const route = `/login/leave/view/${leaveId}`;
    
    createNotification({ id, me, route });

    return res.send({ message: 'Leave file URL updated and notifications sent' });
  } catch (error) {
    return res.send({ message: error.message });
  }
};


exports.approveLeave = async (req, res) => {
  const leaveId = req.params.id;
  const { adminNotes, status } = req.body;

  try {
    // 1. Fetch the local leave record along with local model relations (LeaveType)
    // Removed direct SQL inner-joins to external User tables
    const leave = await Leave.findByPk(leaveId, {
      include: [
        { model: LeaveType, attributes: ['leaveTypeName'], as: 'leaveType' }
      ]
    });

    if (!leave) {
      return res.send({ message: 'Leave request not found' });
    }

    const userId = leave.userId;

    // 2. Fetch critical target profile metadata over the network from the Auth Service
    const employeeProfile = await authService.getUserPersonal(userId);
    if (!employeeProfile) {
      return res.send({ message: 'Employee user profile details not found in authentication cluster' });
    }
    
    const employeeName = employeeProfile.name || "Employee";
    const employeeOfficialEmail = employeeProfile.userPosition?.officialMailId || 
                                  employeeProfile.officialMailId || 
                                  employeeProfile.email;

    // Dynamic penalty note computation
    const currentPenalty = parseFloat(leave.penaltyLOP || 0);
    const penaltyNote = currentPenalty > 0 
      ? `<p><strong>Note:</strong> A penalty of ${currentPenalty} day(s) has been applied as LOP for this request.</p>` 
      : '<p><em>Note: No late application penalties were applied.</em></p>';

    const leaveType = await LeaveType.findByPk(leave.leaveTypeId);
    if (!leaveType) return res.send({ message: 'Leave type not found' });

    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    // --- CASE: HANDLE UNAPPROVED LEAVE (Marked as LOP) ---
    if (status === 'Unapproved') {
      const lopType = await LeaveType.findOne({ where: { leaveTypeName: 'LOP' } });
      if (!lopType) return res.status(404).send('LOP Leave Type not configured in system');

      const [userLOP] = await UserLeave.findOrCreate({
        where: { userId: leave.userId, leaveTypeId: lopType.id, year: startYear },
        defaults: { leaveBalance: 0, takenLeaves: 0, noOfDays: 0 }
      });

      userLOP.takenLeaves += leave.noOfDays;
      await userLOP.save();

      leave.status = 'Unapproved';
      leave.adminNotes = adminNotes;
      await leave.save();
      
      return res.send({ message: 'Leave marked as Unapproved successfully', leave });
    }

    // --- CASE 1: HANDLE LOP LEAVE TYPE ---
    if (leaveType.leaveTypeName === 'LOP') {
      if (startYear === endYear) {
        const userLeave = await UserLeave.findOne({
          where: { userId: leave.userId, leaveTypeId: leave.leaveTypeId, year: startYear },
        });
        if (!userLeave) return res.status(404).send('User leave record not found');
        
        userLeave.takenLeaves += leave.noOfDays;
        await userLeave.save();
      } else {
        const endOfStartYear = new Date(startYear, 11, 31);
        const startOfEndYear = new Date(endYear, 0, 1);
        const daysInStartYear = calculateDays(startDate, endOfStartYear);
        const daysInEndYear = calculateDays(startOfEndYear, endDate);

        const userLeaveStartYear = await UserLeave.findOne({ where: { userId: leave.userId, leaveTypeId: leave.leaveTypeId, year: startYear } });
        const userLeaveEndYear = await UserLeave.findOne({ where: { userId: leave.userId, leaveTypeId: leave.leaveTypeId, year: endYear } });

        if (userLeaveStartYear && userLeaveEndYear) {
          userLeaveStartYear.takenLeaves += daysInStartYear;
          userLeaveEndYear.takenLeaves += daysInEndYear;
          await userLeaveStartYear.save();
          await userLeaveEndYear.save();
        }
      }
    } 
    // --- CASE 2: HANDLE PAID LEAVE TYPES (Casual, Sick, etc.) ---
    else {
      if (startYear === endYear) {
        const userLeave = await UserLeave.findOne({ where: { userId, leaveTypeId: leave.leaveTypeId, year: startYear } });
        if (!userLeave || userLeave.leaveBalance < leave.noOfDays) {
          return res.json({ message: 'Insufficient balance', openNoteDialog: true });
        }
        userLeave.leaveBalance -= leave.noOfDays;
        userLeave.takenLeaves += leave.noOfDays;
        await userLeave.save();
      } else {
        const endOfStartYear = new Date(startYear, 11, 31);
        const startOfEndYear = new Date(endYear, 0, 1);
        const daysInStartYear = calculateDays(startDate, endOfStartYear);
        const daysInEndYear = calculateDays(startOfEndYear, endDate);

        const ulStart = await UserLeave.findOne({ where: { userId, leaveTypeId: leave.leaveTypeId, year: startYear } });
        const ulEnd = await UserLeave.findOne({ where: { userId, leaveTypeId: leave.leaveTypeId, year: endYear } });

        if (!ulStart || !ulEnd || ulStart.leaveBalance < daysInStartYear || ulEnd.leaveBalance < daysInEndYear) {
          return res.json({ message: 'Insufficient balance for one or both years', openNoteDialog: true });
        }
        ulStart.leaveBalance -= daysInStartYear;
        ulStart.takenLeaves += daysInStartYear;
        ulEnd.leaveBalance -= daysInEndYear;
        ulEnd.takenLeaves += daysInEndYear;
        await ulStart.save();
        await ulEnd.save();
      }
    }

    // --- PENALTY APPLICATION (Universal) ---
    if (currentPenalty > 0) {
      const lopType = await LeaveType.findOne({ where: { leaveTypeName: 'LOP' } });
      if (lopType) {
        const [userLOP] = await UserLeave.findOrCreate({
          where: { userId: leave.userId, leaveTypeId: lopType.id, year: startYear },
          defaults: { leaveBalance: 0, takenLeaves: 0, noOfDays: 0 }
        });
        userLOP.takenLeaves += currentPenalty;
        await userLOP.save();
        console.log(`Applied ${currentPenalty} day penalty to takenLeaves`);
      }
    }

    // Finalize Leave Status
    leave.status = 'Approved';
    leave.adminNotes = adminNotes;
    await leave.save();

    // 3. CC Recipients Fetching (Refactored to integrate with updated service calls)
    const hr = await authService.getHRDetails();
    const rm = await getReportingManagerEmailForUser(leave.userId);
    const teamLeads = await getTeamLeadEmails(leave.userId);
    const omMail = await getOMEmail();
    
    const ccRecipients = [
      hr?.mail || hr?.email, 
      rm?.email, 
      ...(Array.isArray(teamLeads) ? teamLeads : []), 
      omMail
    ].filter(email => email);

    // 4. Notifications and Emails
    const me = `${employeeName}'s Leave Request Approved by ${req.user.name}`;
    const route = `/login/leave/open/${leave.id}`;
    createNotification({ id: userId, me, route });

    const emailSubject = `Leave Request is Approved`;
    const fromEmail = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASS;
    const html = `
      <p>Dear ${employeeName},</p>
      <p>This is to inform you that ${req.user.name} has approved your ${leaveType.leaveTypeName}.</p>
      <p><strong>Admin Note:</strong> ${adminNotes || 'None'}</p>
      ${penaltyNote}
      <p>Please review the application in the portal.</p>
    `;

    try {
      const token = req.headers.authorization?.split(' ')[1];
      await sendEmail(token, fromEmail, emailPassword, employeeOfficialEmail, emailSubject, html, [], ccRecipients);
    } catch (e) { 
      console.error('Email failed:', e.message); 
    }

    return res.send({ message: 'Leave approved successfully', leave });

  } catch (error) {
    console.error(error);
    return res.status(500).send(error.message);
  }
};

exports.rejectLeave = async (req, res) => {
  const leaveId = req.params.id;
  const { adminNotes } = req.body;

  try {
    // 1. Fetch the local leave record and its local model relations (LeaveType)
    const leave = await Leave.findByPk(leaveId, {
      include: [
        { model: LeaveType, attributes: ['leaveTypeName'], as: 'leaveType' }
      ]
    });
    
    if (!leave) {
      return res.send({ message: 'Leave request not found' });
    }

    const userId = leave.userId;

    // 2. Fetch the target employee's profile credentials over the network from the Auth service
    const employeeProfile = await authService.getUserPersonal(userId);
    if (!employeeProfile) {
      return res.send({ message: 'Employee user profile details not found in authentication cluster' });
    }

    const employeeName = employeeProfile.name || "Employee";
    const employeeOfficialEmail = employeeProfile.userPosition?.officialMailId || 
                                  employeeProfile.officialMailId || 
                                  employeeProfile.email;

    // 3. Balance Reversal: If the leave was previously Approved, refund their days back safely
    if (leave.status === 'Approved' || leave.status === 'AdminApproved') {
      const ul = await UserLeave.findOne({ 
        where: { userId: leave.userId, leaveTypeId: leave.leaveTypeId } 
      });
      if (ul) {
        ul.leaveBalance += leave.noOfDays;
        ul.takenLeaves -= leave.noOfDays;
        await ul.save();
      }
    }

    // Finalize Local State Mutation
    leave.status = 'Rejected';
    leave.adminNotes = adminNotes;
    await leave.save();

    const me = `${employeeName} Leave Request Rejected by ${req.user.name}`;
    const route = `/login/leave/open/${leave.id}`;

    // 4. Dispatch System Notifications
    // Employee Notification
    createNotification({ id: userId, me, route });

    // HR Admin Notification
    const hr = await authService.getHRDetails();
    const hrId = hr?.id;
    if (hrId) {
      createNotification({ id: hrId, me, route });
    }

    // Reporting Manager Notification
    const rmId = await getRMId(leave.userId);
    if (rmId && !isNaN(rmId)) {
      createNotification({ id: Number(rmId), me, route });
    }

    // 5. Gather Email Context & Flatten CC Arrays Safely
    const hrEmail = hr?.mail || hr?.email;
    
    const rmContext = await getReportingManagerEmailForUser(leave.userId);
    const rmEmail = rmContext?.email;
    
    const teamLeads = await getTeamLeadEmails(leave.userId);
    const omMail = await getOMEmail();

    // Spreading (...teamLeads) prevents multi-dimensional nested array pollution
    const ccRecipients = [
      hrEmail, 
      rmEmail, 
      ...(Array.isArray(teamLeads) ? teamLeads : []), 
      omMail
    ].filter(email => email);

    // 6. Build Payload Template and Ship Communication Over the Wire
    const emailSubject = `Leave Request is Rejected`;
    const fromEmail = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASS;
    const html = `
      <p>Dear ${employeeName},</p>
      <p>This is to inform you that ${req.user.name} has rejected your ${leave.leaveType?.leaveTypeName || 'Leave Request'},</p>
      <p>with notes: <strong>${adminNotes || 'None'}</strong>.</p>
      <p>Please review the leave application at your earliest convenience.</p>
      <p>If you have any questions or need further details, feel free to reach out.</p>
    `;
    
    const attachments = [];
    const token = req.headers.authorization?.split(' ')[1];
    
    try {
      if (employeeOfficialEmail) {
        await sendEmail(token, fromEmail, emailPassword, employeeOfficialEmail, emailSubject, html, attachments, ccRecipients);
      } else {
        console.warn(`Skipping email output for User ID ${userId}: No valid destination email configured.`);
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
    }

    return res.send({ message: 'Leave rejected successfully', leave });
  } catch (error) {
    return res.send({ message: 'An error occurred while rejecting the leave', error: error.message });
  }
};


exports.getLeavesByManager = async (req, res) => {
  try {
    const { reportingManagerId } = req.params;
    const { page = 1, pageSize = 10 } = req.query;

    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    // 1. Fetch all active users from the Auth Microservice
    const allUsers = await authService.getAllActiveUsers();

    // 2. Filter out only the users who report to this manager
    // We check both target ID formats in case of schema variations (reportingMangerId vs reportingManagerId)
    const managedUsers = allUsers.filter(u => 
      Number(u.reportingMangerId) === Number(reportingManagerId) || 
      Number(u.reportingManagerId) === Number(reportingManagerId)
    );

    // If this manager has no team members reporting to them, exit early with an empty list
    if (managedUsers.length === 0) {
      return res.json({
        count: 0,
        items: []
      });
    }

    // Map out an array of user IDs to use in our local SQL query array match
    const managedUserIds = managedUsers.map(u => u.id);

    // Create an easily accessible lookup map for quick in-memory data stitching below
    const managedUsersMap = {};
    managedUsers.forEach(user => {
      managedUsersMap[user.id] = user;
    });

    // 3. Query the local Leave table for requests matching our team's User IDs
    const leaves = await Leave.findAll({
      limit,
      offset,
      order: [['id', 'DESC']],
      where: { 
        status: 'Requested',
        userId: { [Op.in]: managedUserIds } // Dynamic array query optimization
      },
      include: [
        {
          model: LeaveType, 
          as: 'leaveType',
          attributes: ['leaveTypeName']
        }
      ]
    });

    // 4. Count the total records matching these criteria for correct data table pagination 
    const totalCount = await Leave.count({
      where: { 
        status: 'Requested',
        userId: { [Op.in]: managedUserIds }
      }
    });

    // 5. Transform and format payload, attaching cross-service User info back to the object structure
    const formattedLeaves = leaves.map(leave => ({
      ...leave.toJSON(),
      user: {
        id: leave.userId,
        name: managedUsersMap[leave.userId]?.name || "Unknown Employee",
        userpersonal: {
          reportingMangerId: parseInt(reportingManagerId, 10)
        }
      }
    }));

    return res.json({
      count: totalCount,
      items: formattedLeaves,
    });

  } catch (error) {
    return res.status(500).send(error.message);
  }
};

// --------------------------------------------------------REPORT----------------------------------------------------------------

exports.getAllLeaveReport = async (req, res) => {
  try {
    const { year, pageSize, page, search } = req.query;

    if (!year) return res.json({ error: 'Year is required for fetching reports.' });

    const limit = pageSize ? parseInt(pageSize, 10) : 10;
    const pageNumber = page ? parseInt(page, 10) : 1;
    const offset = (pageNumber - 1) * limit;

    // Step 1: Fetch all leave records for the year
    const leaves = await Leave.findAll({
      where: {
        status: { [Op.or]: ['Approved', 'AdminApproved'] },
        startDate: {
          [Op.gte]: new Date(`${year}-01-01`),
          [Op.lt]: new Date(`${+year + 1}-01-01`)
        }
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'url'], where: { separated: false } },
        { model: LeaveType, attributes: ['id', 'leaveTypeName'], as: 'leaveType' }
      ]
    });

    // Step 2: Map leave usages by userId and leaveType
    const leaveUsageMap = {};
    leaves.forEach((leave) => {
      const userId = leave.userId;
      const leaveTypeName = leave.leaveType?.leaveTypeName || 'Unknown Leave';

      if (!leaveUsageMap[userId]) leaveUsageMap[userId] = {};
      if (!leaveUsageMap[userId][leaveTypeName]) {
        leaveUsageMap[userId][leaveTypeName] = {
          monthlyData: Array(12).fill(0),
          total: 0
        };
      }

      leave.leaveDates.forEach((date) => {
        const leaveDate = new Date(date.date);
        if (leaveDate.getFullYear() === parseInt(year, 10)) {
          const monthIndex = leaveDate.getMonth();
          const leaveForDay = date.session1 && date.session2 ? 1 : (date.session1 || date.session2 ? 0.5 : 0);

          leaveUsageMap[userId][leaveTypeName].monthlyData[monthIndex] += leaveForDay;
          leaveUsageMap[userId][leaveTypeName].total += leaveForDay;
        }
      });
    });

    // Step 3: Fetch all UserLeaves for the year (even if they didn’t apply any leave)
    const userLeaves = await UserLeave.findAll({
      where: { year },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'url'],
          where: { separated: false }
        },
        {
          model: LeaveType,
          attributes: ['id', 'leaveTypeName'],
          as: 'leaveType'
        }
      ]
    });

    // Step 4: Group and format user data
    const employeeMap = {};

    userLeaves.forEach((record) => {
      const userId = record.userId;
      const userName = record.user?.name;
      const userUrl = record.user?.url;
      const leaveTypeName = record.leaveType?.leaveTypeName;
      const leaveTypeId = record.leaveType?.id;

      if (!employeeMap[userId]) {
        employeeMap[userId] = {
          id: userId,
          name: userName,
          url: userUrl,
          leaveDetails: []
        };
      }

      const usage = leaveUsageMap[userId]?.[leaveTypeName] || {
        monthlyData: Array(12).fill(0),
        total: 0
      };

      employeeMap[userId].leaveDetails.push({
        type: leaveTypeName,
        typeId: leaveTypeId,
        monthlyData: usage.monthlyData,
        total: usage.total,
        balance: {
          allotted: record.noOfDays,
          consumed: usage.total,
          remaining: record.leaveBalance
        }
      });
    });

    let result = Object.values(employeeMap);

    if (search && search !== 'undefined') {
      const searchTerm = search.replace(/\s+/g, '').trim().toLowerCase();
      result = result.filter(emp => emp.name.toLowerCase().includes(searchTerm));
    }

    const total = result.length;
    const paginatedResult = result.slice(offset, offset + limit);

    res.status(200).json({ result: paginatedResult, total });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: error.message });
  }
}

// ---------------------------------------------------------------LEAVE BALNCE--------------------------------------------------
exports.getLeaveBalanceByLeaveId = async(req,res)=>{
 const leaveId = req.params.leaveId;

  try {
    // Fetch the leave request
    const leave = await Leave.findByPk(leaveId);

    if (!leave) {
      return res.send('Leave request not found');
    }

    // Fetch the leave type
    const leaveType = await LeaveType.findByPk(leave.leaveTypeId);

    if (!leaveType) {
      return res.send('Leave type not found');
    }

    // Handle LOP (Leave Without Pay) scenario
    if (leaveType.leaveTypeName === 'LOP') {
      return res.json({
        isSufficient: true,
        leaveType: 'LOP',
        message: 'LOP leave does not require leave balance check.',
      });
    }
    const leaveYear = new Date(leave.startDate).getFullYear();

    // Fetch user leave balance
    const userLeave = await UserLeave.findOne({
      where: {
        userId: leave.userId,
        leaveTypeId: leave.leaveTypeId,
        year: leaveYear
      },
    });

    if (!userLeave) {
      return res.json({
        isSufficient: false,
        leaveType: leaveType.leaveTypeName,
        message: 'No leave balance record found for this leave type.',
      });
    }

    // Check if leave balance is sufficient
    const isSufficient = userLeave.leaveBalance >= leave.noOfDays;
    res.json({
      isSufficient,
      leaveType: leaveType.leaveTypeName,
      leaveBalance: userLeave.leaveBalance,
      requiredDays: leave.noOfDays,
      message: isSufficient
        ? 'Leave balance is sufficient.'
        : 'Insufficient leave balance.',
    });
  } catch (error) {
    res.send(error.message);
  }
}

exports.getLeaveBalanceByMonth = async(req,res)=>{
  const { employeeId, leaveTypeId, year, month } = req.query;
  try {
    const startDate = new Date(year, month - 1, 1); // month is 1-12
    const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

    const leaveDetails = await Leave.findAll({
      where: {
        userId: employeeId,
        leaveTypeId: leaveTypeId,
        [Op.or]: [
          // Leaves that start within the month
          {
            startDate: {
              [Op.between]: [startDate, endDate]
            }
          },
          // Leaves that end within the month
          {
            endDate: {
              [Op.between]: [startDate, endDate]
            }
          },
          // Leaves that span the entire month
          {
            [Op.and]: [
              { startDate: { [Op.lte]: startDate } },
              { endDate: { [Op.gte]: endDate } }
            ]
          }
        ]
      },
      order: [['startDate', 'ASC']] // Order by start date
    });

    res.send(leaveDetails);
  } catch (error) {
    res.send(error.message);
  }
}

