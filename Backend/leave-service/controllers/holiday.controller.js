/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { sequelize } = require('../config/database');
const Holiday = require('../models/holiday');
const { Op, where } = require('sequelize'); 
const UserLeave = require('../models/userLeave');
const LeaveType = require('../models/leaveType');
const ComboOff = require('../models/compOff');
const xlsx = require('xlsx');
const multer = require('multer');
const moment = require('moment');
const { notifyEmployeesAboutLeave } = require('../utils/notificationService');

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

exports.uploadHoliday = async (req, res) => {
  try {
    if (!req.file) {
      return res.send(' No file uploaded. ');
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const requiredColumns = ['Date', 'Name', 'Type'];
    const missingColumns = requiredColumns.filter(col => !Object.keys(sheetData[0] || {}).includes(col));
    
    if (missingColumns.length > 0) {
      return res.send(`The uploaded file is missing required columns: ${missingColumns.join(', ')}` );
    }

    const supportedFormats = ['MM-DD-YYYY', 'YYYY-MM-DD'];

    // Prepare holidays from the uploaded data
    const holidays = sheetData.map(row => {
      let parsedDate = null;

      if (typeof row['Date'] === 'string') {
        parsedDate = moment(row['Date'], supportedFormats, true);
      } else if (typeof row['Date'] === 'number') {
        parsedDate = moment(new Date((row['Date'] - 25569) * 86400 * 1000));
      };
      
      return {
        name: row['Name'],
        type: row['Type'],
        date: parsedDate.isValid() ? parsedDate.toDate() : null,
        comments: row['Comments'] || null,
      };
    });
    
    // Helper function to format the date to 'yyyy-MM-dd'
    const formatDate = (date) => {
      return date && !isNaN(date) ? date.toISOString().split('T')[0] : null;
    };

    const existingHolidays = await Holiday.findAll({
      attributes: ['date'],
    });

    const existingDates = new Set();
    existingHolidays.forEach(holiday => {
        if (holiday.dataValues && holiday.dataValues.date) {
            existingDates.add(holiday.dataValues.date);
        }
    });
    // Filter out holidays with duplicate dates in the database
    const uploadedDates = holidays.map(holiday => formatDate(holiday.date)).filter(Boolean);
    const addedDates = uploadedDates.filter(date => !existingDates.has(date));
    const notAddedDates = uploadedDates.filter(date => !addedDates.includes(date));
    
    // Filter out holidays with duplicate dates in the database
    const newHolidays = holidays.filter(
      holiday => formatDate(holiday.date) && !existingDates.has(formatDate(holiday.date))
    );
    

    if (newHolidays.length > 0) {
      await Holiday.bulkCreate(newHolidays);
      if(notAddedDates.length > 0){
        return res.send(`${notAddedDates} dates are removed since they were already exist in Holidays list`);
      }else{
        res.status(200).json({
          message: 'Holidays uploaded successfully.',
          newHolidays,
        })
      }
    }else {
      return res.send('No new holidays to add. All holidays are already in the database.');
    }
  } catch (error) {
    res.send(error.message);
  }
}

exports.saveHoliday = async (req, res) => {
  const { name, type, comments, date } = req.body;
  try {
    const holidayExist = await Holiday.findOne({
      where: { date: date}
    })
    if(holidayExist){
      return res.send(`${date} is already marked as a holiday for ${holidayExist.name}`);
    }
  } catch (error) {
    res.send(error.message);
  }
    try {
          const holiday = new Holiday({name, type, comments, date});
          await holiday.save();
          
          res.send(holiday);

    } catch (error) {
        res.send(error.message);
    }
}

exports.deleteHoliday = async (req, res) => {
  try {
      const result = await Holiday.destroy({
          where: { id: req.params.id },
          force: true,
      });

      if (result === 0) {
          return res.status(404).json({
            status: "fail",
            message: "Holiday with that ID not found",
          });
        }
    
        res.status(204).json();
      }  catch (error) {
        res.send(error.message);
  }
  
}

exports.updateHoliday = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    // Validate ID
    if (isNaN(id)) {
      return res.send('Invalid ID format' );
    }

    // Validate request body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.send('Request body cannot be empty');
    }

    // First find the holiday to ensure it exists
    const holiday = await Holiday.findOne({ where: { id: id } });
    if (!holiday) {
      return res.send( `Cannot update Holiday with id=${id}. Holiday was not found.`);
    }
    
    // Perform the update
    await Holiday.update(req.body, {
      where: { id: id }
    });

    // Fetch the updated record (this ensures we get the latest data)
    const updatedHoliday = await Holiday.findOne({ where: { id: id } });
    
    res.json( updatedHoliday );

  } catch (error) {
    res.send( error.message );
  }
}


exports.findHoliday = async (req, res) => {
    try {
        let whereClause = {};
        let limit;
        let offset;
        const today = new Date();

        // Check if the search term is defined
        if (req.query.search && req.query.search !== 'undefined') {
            const searchTerm = req.query.search.replace(/\s+/g, '').trim().toLowerCase();
            whereClause = {
                [Op.or]: [
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('name'), ' ', '')),
                        {
                            [Op.like]: `%${searchTerm}%`
                        }
                    )
                ],
                date: { [Op.gt]: today }
            };
        } else {
            whereClause = {
                date: { [Op.gt]: today }
            };
        }

        // Check if pagination parameters are defined
        if (req.query.pageSize && req.query.page && req.query.pageSize !== 'undefined' && req.query.page !== 'undefined') {
            limit = parseInt(req.query.pageSize, 10);
            offset = (parseInt(req.query.page, 10) - 1) * limit;
        }

        const holiday = await Holiday.findAll({
            order: [['date', 'ASC']],
            limit,
            offset,
            where: whereClause
        });

        let totalCount = await Holiday.count({ where: whereClause });

        // Send response based on pagination
        if (req.query.page && req.query.pageSize && req.query.page !== 'undefined' && req.query.pageSize !== 'undefined') {
            const response = {
                count: totalCount,
                items: holiday,
            };
            res.json(response);
        } else {
            res.json(holiday);
        }
    } catch (error) {
        res.send(error.message); // Sending a 500 status code for server errors
    }
}


exports.findAllHoliday = async(req,res)=>{
try {
      let whereClause = {};
      let limit;
      let offset;
      const currentYear = new Date().getFullYear();
      // Check if the search term is defined
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      whereClause = {
        date: {
          [Op.between]: [startDate, endDate],
        },
      }

      const holiday = await Holiday.findAll({
          order: [['date', 'ASC']],
          limit,
          offset,
          where: whereClause
      });

      res.json(holiday);
  } catch (error) {
      res.send(error.message); // Sending a 500 status code for server errors
  }
}


exports.findByName = async(req,res)=>{
try {
    if (req.query.search && req.query.search !== 'undefined') {
      const searchTerm = req.query.search.replace(/\s+/g, '').trim().toLowerCase();
      const whereClause = {
          [Op.or]: [
              sequelize.where(
                  sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('name'), ' ', '')),
                  {
                      [Op.like]: `%${searchTerm}%`
                  }
              )
          ]
      };

      const holiday = await Holiday.findAll({
        order: [['date', 'ASC']],
        where: whereClause
    });

    res.send(holiday)
    }
  } catch (error) {
    res.send(error.message); 
  }
}


exports.findHolidayByDate = async(req,res)=>{
    try {
        const { date } = req.query;
        if (!date) {
            return res.send( 'Date is required' );
        }

        const holidays = await Holiday.findAll({
            where: {
                date: {
                    [Op.eq]: date,
                },
            },
        });
        
        res.status(200).json(holidays);
    } catch (error) {
        res.send( error.message );
    }
}

exports.findHolidayByYear = async(req,res)=>{

  try {
        const { year } = req.query;

        if (!year) {
            return res.send('Year is required');
        }

        // Create start and end dates for the year
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const holidays = await Holiday.findAll({
          where: {
            date: {
              [Op.between]: [startDate, endDate],
          },
        },
        });

        // Return the result
        res.status(200).json(holidays);
    } catch (error) {
        console.error('Error fetching holidays:', error);
        res.send(error.message)
    }
}


exports.deleteHolidayByYear = async(req,res)=>{
 try {
      const ids = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
          return res.send( 'Array of IDs is required' );
      }

      const result = await Holiday.destroy({
          where: {
              id: ids,
          },
      });

      if (result > 0) {
        res.status(204).json();
      } else {
          res.send('No holidays found with the given IDs');
      }
  } catch (error) {
      res.send(error.message);
  }
}


// comboofffffffffffffffffffffffffffffff----------------------------------------------------------------------------------------
exports.addComboOff = async (req, res) => {
  const id = req.params.id;
  const selectedEmployees = Array.isArray(req.body) ? req.body : (req.body.selectedEmployeeIds || []);
  const employeeLength = selectedEmployees.length;

  try {
    const holiday = await Holiday.findByPk(id);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    holiday.comboAdded = true;
    holiday.comboAddedFor = employeeLength;
    await holiday.save();

    // Ensure Comp Off leave type exists
    const [leaveType] = await LeaveType.findOrCreate({
      where: { leaveTypeName: 'Comp Off' },
      defaults: { leaveTypeName: 'Comp Off' }
    });
    const leaveTypeId = leaveType.id;

    let comboOff = await ComboOff.findOne({ where: { holidayId: id } });
    if (comboOff) {
      comboOff.userId = [...new Set([...(comboOff.userId || []), ...selectedEmployees])];
      await comboOff.save();
    } else {
      comboOff = await ComboOff.create({
        userId: selectedEmployees,
        holidayId: id
      });
    }

    const year = new Date(holiday.date).getFullYear();
    const grantedEmployeeIds = [];
    for (let i = 0; i < selectedEmployees.length; i++) {
      try {
        let ul = await UserLeave.findOne({
          where: { userId: selectedEmployees[i], leaveTypeId: leaveTypeId, year }
        });

        if (ul) {
          ul.noOfDays += 1;
          ul.leaveBalance += 1;
          await ul.save();
        } else {
          const userLeave = new UserLeave({
            userId: selectedEmployees[i],
            leaveTypeId: leaveTypeId,
            noOfDays: 1,
            takenLeaves: 0,
            leaveBalance: 1,
            year: year
          });
          await userLeave.save();
        }
        grantedEmployeeIds.push(Number(selectedEmployees[i]));
      } catch (innerError) {
        console.error('Error updating employee leave balance:', innerError);
      }
    }

    const notificationFailures = await notifyEmployeesAboutLeave({
      employeeIds: grantedEmployeeIds,
      message: `1 Comp Off day was granted to you for ${holiday.name} (${year}).`,
      route: '/login/leave/leave-balance',
      authorization: req.headers.authorization
    });

    return res.json({
      comboOff,
      holiday,
      message: notificationFailures.length
        ? `Comp-Off allocated, but notifications could not be delivered to ${notificationFailures.length} employee(s).`
        : `Comp-Off allocated successfully for ${grantedEmployeeIds.length} employee(s) for ${holiday.name}`,
      notificationFailures: notificationFailures.length
    });
  } catch (error) {
    console.error('Error in addComboOff:', error);
    return res.status(500).json({ error: error.message, message: 'Failed to allocate comp-off' });
  }
};

exports.updateComboOff = async (req, res) => {
  const id = req.params.id;
  const selectedEmployees = req.body.selectedEmployeeIds || [];
  const deselectedEmployees = req.body.deselectedEmployeeIds || [];
  const employeeLength = selectedEmployees.length;

  try {
    const holiday = await Holiday.findByPk(id);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    holiday.comboAdded = true;
    holiday.comboAddedFor = (holiday.comboAddedFor || 0) + employeeLength - deselectedEmployees.length;
    if (holiday.comboAddedFor < 0) holiday.comboAddedFor = 0;
    await holiday.save();

    // Ensure Comp Off leave type exists
    const [leaveType] = await LeaveType.findOrCreate({
      where: { leaveTypeName: 'Comp Off' },
      defaults: { leaveTypeName: 'Comp Off' }
    });
    const leaveTypeId = leaveType.id;

    let comboOff = await ComboOff.findOne({ where: { holidayId: id } });
    if (!comboOff) {
      comboOff = await ComboOff.create({
        holidayId: id,
        userId: []
      });
    }

    const currentUsers = Array.isArray(comboOff.userId) ? comboOff.userId : [];
    const remainingUsers = currentUsers.filter(userId => !deselectedEmployees.includes(userId));
    const newUserIds = selectedEmployees.filter(userId => !remainingUsers.includes(userId));

    comboOff.userId = [...new Set([...remainingUsers, ...newUserIds])];
    await comboOff.save();
    await comboOff.reload();

    const year = new Date(holiday.date).getFullYear();
    const grantedEmployeeIds = [];

    // Update leave balances for deselected employees (decrement 1)
    await Promise.all(deselectedEmployees.map(async (userId) => {
      try {
        const ul = await UserLeave.findOne({ where: { userId, leaveTypeId, year } });
        if (ul) {
          ul.noOfDays = Math.max(0, ul.noOfDays - 1);
          ul.leaveBalance = ul.leaveBalance - 1;
          await ul.save();
        }
      } catch (err) {
        console.error('Error deducting leave balance for user', userId, err);
      }
    }));

    // Update leave balances for selected employees (increment 1)
    await Promise.all(selectedEmployees.map(async (userId) => {
      try {
        const ul = await UserLeave.findOne({ where: { userId, leaveTypeId, year } });
        if (ul) {
          ul.noOfDays += 1;
          ul.leaveBalance += 1;
          await ul.save();
        } else {
          const userLeave = new UserLeave({
            userId,
            leaveTypeId,
            noOfDays: 1,
            takenLeaves: 0,
            leaveBalance: 1,
            year: year
          });
          await userLeave.save();
        }
        grantedEmployeeIds.push(Number(userId));
      } catch (err) {
        console.error('Error adding leave balance for user', userId, err);
      }
    }));

    const notificationFailures = await notifyEmployeesAboutLeave({
      employeeIds: grantedEmployeeIds,
      message: `1 Comp Off day was granted to you for ${holiday.name} (${year}).`,
      route: '/login/leave/leave-balance',
      authorization: req.headers.authorization
    });

    const updatedComboOff = await ComboOff.findOne({ where: { holidayId: id } });

    return res.json({
      updatedComboOff,
      holiday,
      message: notificationFailures.length
        ? `Comp-Off updated, but notifications could not be delivered to ${notificationFailures.length} employee(s).`
        : `Comp-Off updated successfully for ${holiday.name}`,
      notificationFailures: notificationFailures.length
    });
  } catch (error) {
    console.error('Error in updateComboOff:', error);
    return res.status(500).json({ error: error.message, message: 'Failed to update comp-off' });
  }
};


exports.findComboOff = async (req, res) => {
  let holidayId = req.params.id
  try {
    const co = await ComboOff.findOne({ where: { holidayId: holidayId}})
    res.send(co)
  } catch (error) {
    res.send(error.message)
  }
}

exports.findHolidayById = async (req, res) => {
  let holidayId = req.params.id;
  try {
    const holiday = await Holiday.findByPk(holidayId);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }
    res.json(holiday);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

