const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth');
const UserLeave = require('../models/userLeave');
const LeaveType = require('../models/leaveType');
const { where } = require('sequelize');
const Leave = require('../models/leave');
const { Sequelize, Op } = require('sequelize');
const authService = require('../utils/authService'); 
const { notifyEmployeesAboutLeave } = require('../utils/notificationService');

exports.getLeaveCount = async (req, res) => {
     try {
    const userId = req.params.userId;
    const leaveTypeId = req.params.typeid;
    const year = req.params.year; 
    
    // Find the leave type details
    const leaveType = await LeaveType.findOne({
      where: { id: leaveTypeId },
      attributes: ['leaveTypeName', 'id'],
    });

    if (!leaveType) {
      return res.send('Leave type not found');
    }

    let monthlyLOPCount = 0;
    if (leaveType.leaveTypeName === 'LOP') {
      const currentDate = new Date();
      const startOfMonth = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1)); // Start of month in UTC
      const endOfMonth = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 0, 23, 59, 59, 999)); // End of month in UTC
    
      // Fetch all LOP leaves for the user in the current month
      const lopLeaves = await Leave.findAll({
        where: {
          userId,
          leaveTypeId,
          status: { [Op.in]: ['Approved', 'AdminApproved'] },
          [Op.or]: [
            // Leaves that start and end within the current month
            {
              startDate: { [Op.between]: [startOfMonth, endOfMonth] },
              endDate: { [Op.between]: [startOfMonth, endOfMonth] },
            },
            // Leaves that start in the previous month but end in the current month
            {
              startDate: { [Op.lt]: startOfMonth },
              endDate: { [Op.between]: [startOfMonth, endOfMonth] },
            },
            // Leaves that start in the current month but end in the next month
            {
              startDate: { [Op.between]: [startOfMonth, endOfMonth] },
              endDate: { [Op.gt]: endOfMonth },
            },
            // Leaves that span the entire current month (start before and end after)
            {
              startDate: { [Op.lt]: startOfMonth },
              endDate: { [Op.gt]: endOfMonth },
            },
          ],
        },
      });
    
      // Calculate the total LOP days in the current month
      monthlyLOPCount = lopLeaves.reduce((count, leave) => {
        const leaveDates = leave.leaveDates; 
        leaveDates.forEach((leaveDate) => {
          const date = new Date(leaveDate.date + 'T00:00:00.000Z'); 
          // Check if the date falls within the current month
          if (date >= startOfMonth && date <= endOfMonth) {
            if (leaveDate.session1 && leaveDate.session2) {
              count += 1; // Both sessions: 1 full day
            } else if (leaveDate.session1 || leaveDate.session2) {
              count += 0.5; // One session: 0.5 day
            }
          }
        });
        return count;
      }, 0);

    }
    const userLeaves = await UserLeave.findOne({
      where: { userId, leaveTypeId, year },
      include: {
        model: LeaveType,
        as: 'leaveType',
        attributes: ['leaveTypeName', 'id'],
      },
    });

    const pendingLeaves = await Leave.findAll({
      where: {
        userId,
        status: 'Requested',
      },
      attributes: ['leaveTypeId', 'noOfDays'],
    });

    const pendingLeaveCounts = pendingLeaves.reduce((acc, leave) => {
      const leaveTypeId = leave.leaveTypeId;
      if (!acc[leaveTypeId]) {
        acc[leaveTypeId] = 0;
      }
      acc[leaveTypeId] += leave.noOfDays;
      return acc;
    }, {});

    // Inject pending leave count into the userLeaves object
    if (userLeaves) {
      userLeaves.dataValues.pendingLeaveCount = pendingLeaveCounts[userLeaves.leaveTypeId] || 0;
    }
    
    return res.json({userLeaves, monthlyLOPCount});
  } catch (error) {
    res.send(error.message);
  }
}


exports.create = async(req,res)=>{
try {
    const { userId, leaveTypeId, noOfDays, takenLeaves, leaveBalance } = req.body;

    const userLeave = new UserLeave({
      userId,
      leaveTypeId,
      noOfDays,
      takenLeaves,
      leaveBalance,
    });

    await userLeave.save();
    res.send(userLeave);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}

exports.grantSelectedEmployees = async (req, res) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'Select at least one employee.' });
  }

  if (!userIds.every((userId) => Number.isInteger(userId) && userId > 0)) {
    return res.status(400).json({ message: 'Employee IDs must be positive integers.' });
  }

  const selectedUserIds = [...new Set(userIds)];
  const year = new Date().getFullYear();

  try {
    const confirmedEmployees = await authService.getConfirmedEmployees(req.headers.authorization);
    const eligibleEmployeeIds = new Set(
      confirmedEmployees.map((user) => Number(user.id))
    );

    if (selectedUserIds.some((userId) => !eligibleEmployeeIds.has(userId))) {
      return res.status(400).json({
        message: 'Leave can only be granted to confirmed employees.'
      });
    }

    const leaveTypes = await LeaveType.findAll({
      where: { leaveTypeName: ['Sick Leave', 'Casual Leave'] },
      attributes: ['id', 'leaveTypeName']
    });
    const requiredTypes = ['Sick Leave', 'Casual Leave'];
    const typesByName = new Map(leaveTypes.map((leaveType) => [leaveType.leaveTypeName, leaveType]));
    const missingTypes = requiredTypes.filter((name) => !typesByName.has(name));

    if (missingTypes.length > 0) {
      return res.status(404).json({
        message: `Required leave types not found: ${missingTypes.join(', ')}.`
      });
    }

    await UserLeave.sequelize.transaction(async (transaction) => {
      for (const userId of selectedUserIds) {
        for (const leaveTypeName of requiredTypes) {
          const leaveType = typesByName.get(leaveTypeName);
          const userLeave = await UserLeave.findOne({
            where: { userId, leaveTypeId: leaveType.id, year },
            transaction,
            lock: transaction.LOCK.UPDATE
          });

          if (userLeave) {
            userLeave.noOfDays = Number(userLeave.noOfDays || 0) + 1;
            userLeave.leaveBalance = Math.max(
              userLeave.noOfDays - Number(userLeave.takenLeaves || 0),
              0
            );
            await userLeave.save({ transaction });
          } else {
            await UserLeave.create({
              userId,
              leaveTypeId: leaveType.id,
              noOfDays: 1,
              takenLeaves: 0,
              leaveBalance: 1,
              year
            }, { transaction });
          }
        }
      }
    });

    const notificationFailures = await notifyEmployeesAboutLeave({
      employeeIds: selectedUserIds,
      message: `1 Sick Leave and 1 Casual Leave were granted to you for ${year}.`,
      route: '/login/leave/leave-balance',
      authorization: req.headers.authorization
    });

    return res.json({
      message: notificationFailures.length
        ? `Leave granted, but notifications could not be delivered to ${notificationFailures.length} employee(s).`
        : `Granted 1 Sick Leave and 1 Casual Leave to ${selectedUserIds.length} employee(s).`,
      grantedEmployees: selectedUserIds.length,
      year,
      notificationFailures: notificationFailures.length
    });
  } catch (error) {
    console.error('Error granting selected employees leave:', error);
    return res.status(500).json({ message: 'Failed to grant leave to selected employees.' });
  }
};

exports.getAll = async(req,res)=>{
try {
    const userLeaves = await UserLeave.findAll({});
    res.send(userLeaves);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}

exports.getByUserAndType = async(req,res)=>{
try {
    const userLeaves = await UserLeave.findOne({
      where: { userId : req.params.userid, leaveTypeId: req.params.typeid, year: new Date().getFullYear()}
    });
    res.send(userLeaves);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}

exports.getByUser = async(req,res)=>{
    try {
    const currentYear = new Date().getFullYear();
    const userLeaves = await UserLeave.findAll({
      where: { userId : req.params.userid, year: currentYear},
      include: [{ model: LeaveType, as: 'leaveType', attributes: ['leaveTypeName'] }],
      order: [
        [
          Sequelize.literal(`CASE
            WHEN "leaveType"."leaveTypeName" = 'Casual Leave' THEN 1
            WHEN "leaveType"."leaveTypeName" = 'Sick Leave' THEN 2
            WHEN "leaveType"."leaveTypeName" = 'Comp Off' THEN 3
            WHEN "leaveType"."leaveTypeName" = 'LOP' THEN 4
            ELSE 5
          END`)
        ]
      ]
    });
    res.send(userLeaves);
  } catch (error) {
    res.send( error.message );
  }
}

exports.update = async(req,res)=>{
let  data  = req.body;
  try {
    let updated = [];
    for( let i = 0; i < data.length; i++ ){
      let ulExist = await UserLeave.findOne({
        where: { userId: data[i].userId, leaveTypeId: data[i].leaveTypeId, year: new Date().getFullYear() }
      })
      if(ulExist){
        ulExist.noOfDays  = +data[i].noOfDays;
        ulExist.takenLeaves = +data[i].takenLeaves;
        ulExist.leaveBalance = +data[i].leaveBalance;
        
        await ulExist.save();
        updated.push(ulExist);
      }else{
        let userLeave = new UserLeave({
          userId: data[i].userId,
          leaveTypeId: data[i].leaveTypeId,
          noOfDays: +data[i].noOfDays,
          takenLeaves: +data[i].takenLeaves,
          leaveBalance: +data[i].leaveBalance,
          year: new Date().getFullYear()
        })
        await userLeave.save();
        updated.push(userLeave);
      }
    }
    res.send(updated);
  } catch (error) {
    res.send(error.message)
  }
}

exports.getForEncashmentOld = async(req,res)=>{
try {
    const year = req.params.year
    const leaveTypes = await LeaveType.findAll({
      where: { leaveTypeName: ['Casual Leave', 'Comp Off'] },
      attributes: ['id', 'leaveTypeName']
    });

    const cl = leaveTypes.find(type => type.leaveTypeName === 'Casual Leave')?.id;
    const co = leaveTypes.find(type => type.leaveTypeName === 'Comp Off')?.id;
    if (!cl || !co) {
      return res.send("Required leave types not found");
    }

    const userLeaves = await UserLeave.findAll({
      where: { leaveTypeId: [cl, co], year },
      include: {
        model: User,
        attributes: ['id', 'name'],
      },
      attributes: ['userId', 'leaveTypeId', 'leaveBalance'],
    });
    const encashment = [];
    const userMap = {};

    userLeaves.forEach(leave => {
      const userId = leave.userId;
      if (!userMap[userId]) {
        userMap[userId] = { userId, casualLeave: 0, combOff: 0, totalLeave: 0 };
      }

      if (leave.leaveTypeId === cl) {
        userMap[userId].casualLeave = leave.leaveBalance;
      } else if (leave.leaveTypeId === co) {
        userMap[userId].combOff = leave.leaveBalance;
      }

      userMap[userId].totalLeave =
        (userMap[userId].casualLeave || 0) + (userMap[userId].combOff || 0);
    });

    for (const user of Object.values(userMap)) {
      encashment.push(user);
    }

    res.send(encashment);
  } catch (error) {
    res.send(error.message);
  }
}

exports.getForEncashment = async (req, res) => {
  try {
    const year = req.params.year;
    
    // 1. Fetch target leave type records locally
    const leaveTypes = await LeaveType.findAll({
      where: { leaveTypeName: ['Casual Leave', 'Comp Off'] },
      attributes: ['id', 'leaveTypeName']
    });

    const cl = leaveTypes.find(type => type.leaveTypeName === 'Casual Leave')?.id;
    const co = leaveTypes.find(type => type.leaveTypeName === 'Comp Off')?.id;
    
    if (!cl || !co) {
      return res.status(404).send("Required leave types not found");
    }

    // 2. Query leave metrics ONLY (Association to User removed since table moved)
    const userLeaves = await UserLeave.findAll({
      where: { leaveTypeId: [cl, co], year },
      attributes: ['userId', 'leaveTypeId', 'leaveBalance'],
    });

    // 3. Request user master details from Auth Service via your custom utility 
    const externalUsers = await authService.getAllActiveUsers();

    // 4. Index external users into a map for O(1) lightning-fast in-memory lookup
    const externalUsersMap = {};
    externalUsers.forEach(user => {
      externalUsersMap[user.id] = user;
    });

    const userMap = {};

    // 5. Build and hydrate the encashment report
    userLeaves.forEach(leave => {
      const userId = leave.userId;
      
      if (!userMap[userId]) {
        userMap[userId] = { 
          userId, 
          // Match the name from our memory-map using the unique ID
          name: externalUsersMap[userId]?.name || "Unknown User",
          casualLeave: 0, 
          combOff: 0, 
          totalLeave: 0 
        };
      }

      if (leave.leaveTypeId === cl) {
        userMap[userId].casualLeave = leave.leaveBalance;
      } else if (leave.leaveTypeId === co) {
        userMap[userId].combOff = leave.leaveBalance;
      }

      userMap[userId].totalLeave =
        (userMap[userId].casualLeave || 0) + (userMap[userId].combOff || 0);
    });

    // 6. Return response array matching your old structure perfectly
    res.json(Object.values(userMap));
    
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.delete = async(req,res)=>{
  try {
      const result = await UserLeave.destroy({
          where: { id: req.params.id },
          force: true,
      });

      if (result === 0) {
          return res.status(404).json({
            status: "fail",
            message: "UserLeave with that ID not found",
          });
        }
    
        res.status(204).json();
      }  catch (error) {
        res.send(error.message);
  }
  
}
