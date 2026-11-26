/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const Role = require('../models/role')
const { Op } = require('sequelize');
const { sequelize, syncAllPostgresSequences } = require('../config/database');
const { upload } = require('../utils/userImageMulter');
const s3 = require('../utils/s3bucket');
const UserPersonal = require('../models/userPersonal');
const UserPosition = require('../models/userPosition');
const Designation = require('../models/designation');
const StatutoryInfo = require('../models/statutoryInfo');
const UserDocument = require('../models/userDocument');
const UserAccount = require('../models/userAccount');
const UserNominee = require('../models/userNominee');
const UserQualification = require('../models/userQualification');
const { sendEmail } = require('../utils/emailService');
const config = require('../utils/config');
const { assign } = require('nodemailer/lib/shared');

exports.addUser = async (req, res) => {

  const { name, email, phoneNumber, password, status, userImage, url, empNo, director, officialMailId } = req.body;

  try {
    if (typeof syncAllPostgresSequences === 'function') {
      await syncAllPostgresSequences();
    }

    let roleId = req.body.roleId;
    if (!roleId) {
      let role = await Role.findOne({ where: { roleName: 'Employee' } });
      if (!role) {
        [role] = await Role.findOrCreate({
          where: { roleName: 'Employee' },
          defaults: { roleName: 'Employee', abbreviation: 'EMP', status: true, department: 'General' }
        });
      }
      roleId = role?.id;
    }

    const userExist = await User.findOne({
      where: {
        [Op.or]: [
          { email: email, roleId: roleId },
          { empNo: empNo }
        ]
      }
    });
    
    if (userExist) {
      return res.send(`User already exists with the email or employee number`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name, empNo, email, phoneNumber, password: hashedPassword, roleId, status, userImage, url, director
    });

    if(officialMailId){
      const emailSubject = `Welcome to the Company!`;
      const fromEmail = process.env.EMAIL_USER;
      const emailPassword = process.env.EMAIL_PASS;
      const frontEndUrl = process.env.FRONT_END;
      const html = `
        <p>Dear ${name},</p>
        <p>Congratulations on joining our company!.</p>
        <p>Here are your login credentials:</p>
        <p>Username: ${empNo}\nPassword: ${password}</p>
        <p>Please keep this information secure.</p>
        <p>You can log in here: <a href="${frontEndUrl}" target="_blank">${frontEndUrl}</a></p>
        <p>We are excited to have you onboard and look forward to working together.</p>
      `;
      const attachments = []
      const token = req.headers.authorization?.split(' ')[1];
      try {
        await sendEmail(token, fromEmail, emailPassword, officialMailId, emailSubject, html, attachments);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }

      const userPos = new UserPosition({userId: user.id, officialMailId: officialMailId})
      await userPos.save();
    }

    
    res.send(user)
  } catch (error) {
    res.send(error.message);
  }
}

exports.findAllUsers = async (req, res) => {
  try {
    let whereClause = { separated: false, status: true };
    let limit;
    let offset;

    if (req.query.search && req.query.search !== 'undefined' && req.query.search.trim() !== '') {
      const searchTerm = req.query.search.replace(/\s+/g, '').trim().toLowerCase();
      whereClause = {
        [Op.and]: [
          {
            [Op.or]: [
              sequelize.where(
                sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('name'), ' ', '')),
                { [Op.like]: `%${searchTerm}%` }
              ),
              sequelize.where(
                sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('empNo'), ' ', '')),
                { [Op.like]: `%${searchTerm}%` }
              ),
              sequelize.where(
                sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('phoneNumber'), ' ', '')),
                { [Op.like]: `%${searchTerm}%` }
              ),
              sequelize.where(
                sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.col('email'), ' ', '')),
                { [Op.like]: `%${searchTerm}%` }
              )
            ]
          },
          { status: true },
          { separated: false }
        ]
      };
    }

    if (req.query.pageSize && req.query.page && req.query.pageSize !== 'undefined' && req.query.page !== 'undefined') {
      limit = parseInt(req.query.pageSize, 10);
      offset = (parseInt(req.query.page, 10) - 1) * limit;
    }

    const users = await User.findAll({
      where: whereClause,
      order: [['id', 'ASC']],
      include: [
        { model: Role, as: 'role', attributes: ['id', 'roleName'], required: false },
        {
          model: UserPosition,
          as: 'userPosition',
          required: false,
          attributes: ['id', 'designationId', 'officialMailId', 'department'],
          include: [
            { model: Designation, as: 'designation', required: false, attributes: ['id', 'designationName', 'abbreviation'] }
          ]
        },
        {
          model: UserPersonal,
          as: 'userPersonal',
          required: false,
          attributes: ['id', 'reportingMangerId', 'dateOfJoining', 'bloodGroup', 'gender']
        }
      ],
      limit,
      offset,
      subQuery: false
    });
    
    const totalCount = await User.count({
      where: whereClause
    });

    if (req.query.page && req.query.pageSize && req.query.page !== 'undefined' && req.query.pageSize !== 'undefined') {
      const response = {
        count: totalCount,
        items: users
      };
      res.json(response);
    } else {
      res.send(users);
    }
  } catch (error) {
    console.error("Error in findAllUsers:", error);
    res.status(500).json({ error: error.message });
  }
}


exports.UserSearchName = async (req, res) => {
  try {
    let whereClause = {};
    if (req.query.search) {
      const searchTerm = req.query.search.replace(/\s+/g, '').trim().toLowerCase();
      whereClause = {
        [Op.and]: [
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            {
              [Op.like]: `%${searchTerm}%`
            }
          )
        ]
      };
    }

    const result = await User.findAll({
      where: whereClause,
      order: [["id", "ASC"]]
    });

    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
}



exports.updateStatus = async (req, res) => {
  try {
    let status = req.body.status;
    let result = await User.findByPk(req.params.id);
    result.status = status
    await result.save();
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
}

exports.UserFindOne = async (req, res) => {
  let id = req.params.id;

  try {
    const user = await User.findByPk(id, {
      include: [
        { 
          model: Role, 
          as: 'role', 
          attributes: ['id', 'roleName'] 
        },
        { 
          model: UserPosition, 
          as: 'userPosition',
          attributes: ['designationId', 'department', 'location'],
          include: [
            { 
              model: Designation, 
              as: 'designation', 
              attributes: ['id', 'designationName', 'abbreviation']
            }
          ]
        },
        { 
          model: UserPersonal, 
          as: 'userPersonal',
          attributes: ['dateOfBirth', 'dateOfJoining'] 
        },
        {
          model: UserAccount,
          as: 'userAccount',
          attributes: ['bankName', 'accountNo']
        },
        {
          model: StatutoryInfo,
          as: 'statutoryInfo',
          attributes: ['panNumber', 'pfNumber', 'uanNumber']
        }
      ]
    });

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    res.status(200).send(user);
  } catch (error) {
    console.error("UserFindOne Error:", error);
    res.status(500).send({ message: error.message });
  }
};


exports.UpdateUser = async(req,res)=>{
  const { name, email, phoneNumber, url, empNo} = req.body;
  try {
    let result = await User.findByPk(req.params.id);
    result.name = name;
    result.email = email;
    result.phoneNumber = phoneNumber;
    result.url = url;
    result.empNo = empNo;
    await result.save();
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }

}

exports.UpdateImage = async (req,res)=>{
    const {url} = req.body;
  try {
    let result = await User.findByPk(req.params.id);
    result.url = url

    await result.save();
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
}

exports.DeleteUser = async (req,res)=>{
    const id = req.params.id
  try {
    const user = await User.findByPk(id)
    const fileKey = user.url;

    if(fileKey){
      const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME || 'aerohr-uploads',
        Key: fileKey.replace(/^https?:\/\/[^\/]+\//, '')
      };
      await s3.deleteObject(deleteParams).promise();
    }

    const userDoc = await UserDocument.findAll({ where: {userId: user.id} });
    if(userDoc.length > 0){
        for(let i = 0; i < userDoc.length; i++) {
          const docKey = userDoc[i].docUrl;
          if (docKey) {
            const deleteParams = {
              Bucket: process.env.AWS_BUCKET_NAME || 'aerohr-uploads',
              Key: docKey.replace(/^https?:\/\/[^\/]+\//, '')
            };
            await s3.deleteObject(deleteParams).promise();
          }
        }
    }

    const result = await user.destroy({
      force: true
    });
    if (result === 0) {
      return res.json({
        status: "fail",
        message: "User with that ID not found",
      });
    }

    res.status(204).json();
  } catch (error) {
    res.send(error.message)
  }
}

exports.FindByRole = async (req,res)=>{
   try {
    const user = await User.findAll({
      where: { roleId: req.params.id, separated: false }
    })
    res.send(user);
  } catch (error) {
    res.send(error.message)
  }
}

exports.FindRoleByRolename = async(req,res)=>{
    try {
    const users = await User.findAll({
      include: { model: Role,
        as: 'role',
         where: [{ roleName: req.params.roleName} ] },
      where: { separated: false }
    });

    res.send(users);
  } catch (error) {
    res.send(error.message );
  }
}

exports.FindDirectors = async (req, res) => {
  try {
    const user = await User.findAll({
      where: { director: true, separated: false },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'roleName'], required: false },
        {
          model: UserPosition,
          as: 'userPosition',
          required: false,
          attributes: ['id', 'designationId', 'officialMailId', 'department'],
          include: [
            { model: Designation, as: 'designation', required: false, attributes: ['id', 'designationName', 'abbreviation'] }
          ]
        }
      ]
    });
    res.send(user);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.FindSeparated = async (req, res) => {
  try {
    const user = await User.findAll({
      where: { separated: true },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'roleName'],
          required: false
        },
        {
          model: UserPosition,
          as: 'userPosition',
          required: false,
          attributes: ['id', 'designationId', 'officialMailId', 'department'],
          include: [
            {
              model: Designation,
              as: 'designation',
              required: false,
              attributes: ['id', 'designationName', 'abbreviation']
            }
          ]
        }
      ]
    });
    res.send(user);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.findReportingManager = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const users = await User.findAll({
      where: {
        separated: false,
      },
      include: [
        {
          model: UserPersonal,
          as: 'userPersonal',
          required: true,
          where: {
            reportingMangerId: id,
          },
        },
        { model: Role, as: 'role', attributes: ['id', 'roleName'], required: false },
        {
          model: UserPosition,
          as: 'userPosition',
          required: false,
          attributes: ['id', 'designationId', 'officialMailId', 'department'],
          include: [
            { model: Designation, as: 'designation', required: false, attributes: ['id', 'designationName', 'abbreviation'] }
          ]
        }
      ],
    });

    res.send(users);
  } catch (error) {
    res.status(500).send(error.message);
  }
};


exports.fileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file type' });
    }

    const sanitizedFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const bucket = process.env.AWS_BUCKET_NAME || 'aerohr-uploads';
    const key = `oac/Users/Images/${Date.now()}_${sanitizedFileName}`;

    const params = {
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    };

    const data = await s3.upload(params).promise();

    const fileUrl = data.Key || key;

    res.status(200).json({
      message: 'File uploaded successfully',
      file: req.file,
      fileUrl: fileUrl,
      url: data.Location
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: error.message || 'File upload failed' });
  }
}

exports.fileDelete = async (req, res) => {
  const id = req.query.id;
  let fileKey;

  try {
    if (id) {
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      fileKey = user.url;
      user.url = '';
      await user.save();
    }

    if (!fileKey) {
      const key = req.query.key;
      fileKey = key;
    }

    if (!fileKey) {
      return res.json({ message: "File key is missing" });
    }

    fileKey = fileKey.replace(/^https?:\/\/[^\/]+\//, '');

    const deleteParams = {
      Bucket: process.env.AWS_BUCKET_NAME || 'aerohr-uploads',
      Key: fileKey,
    };

    await s3.deleteObject(deleteParams).promise();

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("File delete error:", error);
    res.status(500).json({ error: error.message });
  }
}

exports.fileDeleteByURL = async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) {
      return res.status(400).json({ message: 'No file key provided' });
    }

    const fileKey = key.replace(/^https?:\/\/[^\/]+\//, '');

    const deleteParams = {
      Bucket: process.env.AWS_BUCKET_NAME || 'aerohr-uploads',
      Key: fileKey
    };

    await s3.deleteObject(deleteParams).promise();

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('File delete by URL error:', error);
    res.status(500).json({ message: error.message });
  }
}


exports.underProbation = async (req, res) => {
  try {
    const user = await User.findAll({
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'roleName'],
          required: false
        },
        {
          model: UserPosition,
          as: 'userPosition',
          attributes: ['id', 'designationId', 'officialMailId', 'department'],
          required: false,
          include: [
            { model: Designation, as: 'designation', required: false, attributes: ['id', 'designationName', 'abbreviation'] }
          ]
        }
      ],
      order: [['name', 'ASC']],
      where: {
        isTemporary: true,
        separated: false
      }
    });
    res.send(user);
  } catch (error) {
    console.error("Error in underProbation:", error);
    res.status(500).json({ error: error.message });
  }
}

exports.confirmed = async (req, res) => {
  try {
    const user = await User.findAll({
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'roleName'],
          required: false
        },
        {
          model: UserPosition,
          as: 'userPosition',
          attributes: ['id', 'designationId', 'officialMailId', 'department'],
          required: false,
          include: [
            { model: Designation, as: 'designation', required: false, attributes: ['id', 'designationName', 'abbreviation'] }
          ]
        }
      ],
      where: {
        isTemporary: false,
        separated: false
      },
      order: [['name', 'ASC']],
    });
    res.send(user);
  } catch (error) {
    console.error("Error in confirmed:", error);
    res.status(500).json({ error: error.message });
  }
}

exports.confirmEmployee = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const post = await UserPosition.findOne({
      where: { userId }
    });

    const note = req.query.note || req.body?.note || '';
    const statusParam = (req.query.status || req.body?.status || req.body?.targetStatus || '').toLowerCase();
    const isTempParam = req.query.isTemporary !== undefined 
      ? (req.query.isTemporary === 'true') 
      : (req.body?.isTemporary !== undefined ? !!req.body.isTemporary : undefined);

    let setToProbation = false;
    if (statusParam === 'probation' || isTempParam === true) {
      setToProbation = true;
    } else if (statusParam === 'confirmation' || statusParam === 'confirmed' || isTempParam === false) {
      setToProbation = false;
    } else {
      setToProbation = !user.isTemporary;
    }

    if (setToProbation) {
      user.isTemporary = true;
      await user.save();

      if (post) {
        post.probationNote = note || post.probationNote;
        post.confirmationDate = null;
        await post.save();
      }

      return res.json({
        success: true,
        message: `${user.name} status changed to probation successfully.`,
        isTemporary: true
      });
    } else {
      user.isTemporary = false;
      await user.save();

      if (post) {
        post.probationNote = note || post.probationNote;
        post.confirmationDate = req.query.date || req.body?.date || new Date();
        await post.save();
      }

      return res.json({
        success: true,
        message: `${user.name} is confirmed successfully.`,
        isTemporary: false
      });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};

exports.findTotalAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).json(users); 
  } catch (error) {
    res.send( error.message );
  }
}


exports.resignEmployee = async (req, res) => {
  try {
      let result = await User.findByPk(req.params.id);
      
      if (!result) {
          return res.json({ message: "Employee not found" });
      }
      
      result.separated = req.body.confirmed;
      result.status = !req.body.confirmed;
      result.separationNote = req.body.note;
      result.separationDate = req.body.date;
      await result.save();
      res.json({ result });
  } catch (error) {
      res.send(error.message );
  }
}

exports.editNote = async (req, res) => {
  try {
      let result = await User.findByPk(req.params.id);
      
      if (!result) {
          return res.json({ message: "Employee not found" });
      }
      result.separationNote = req.body.note;
      result.separationDate = req.body.date;
      await result.save();
      res.json({ result });
  } catch (error) {
      res.send( error.message);
  }
}

exports.exportAllEmployees = async (req, res) => {
  try {
    const whereClause = {};
    if (req.query.includeSeparated !== 'true') {
      whereClause.separated = false;
    }

    const users = await User.findAll({
      where: whereClause,
      order: [['empNo', 'ASC'], ['name', 'ASC']],
      include: [
        { model: Role, as: 'role', attributes: ['id', 'roleName'], required: false },
        {
          model: UserPosition,
          as: 'userPosition',
          required: false,
          include: [
            { model: Designation, as: 'designation', required: false, attributes: ['id', 'designationName', 'abbreviation'] }
          ]
        },
        {
          model: UserPersonal,
          as: 'userPersonal',
          required: false,
          include: [
            { model: User, as: 'ReportingManager', required: false, attributes: ['id', 'name', 'empNo'] }
          ]
        },
        { model: UserAccount, as: 'userAccount', required: false },
        { model: StatutoryInfo, as: 'statutoryInfo', required: false },
        { model: UserNominee, as: 'userNominee', required: false },
        { model: UserQualification, as: 'userQualification', required: false }
      ]
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error("Error in exportAllEmployees:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.exportSingleEmployee = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findByPk(id, {
      include: [
        { model: Role, as: 'role', attributes: ['id', 'roleName'], required: false },
        {
          model: UserPosition,
          as: 'userPosition',
          required: false,
          include: [
            { model: Designation, as: 'designation', required: false, attributes: ['id', 'designationName', 'abbreviation'] }
          ]
        },
        {
          model: UserPersonal,
          as: 'userPersonal',
          required: false,
          include: [
            { model: User, as: 'ReportingManager', required: false, attributes: ['id', 'name', 'empNo'] }
          ]
        },
        { model: UserAccount, as: 'userAccount', required: false },
        { model: StatutoryInfo, as: 'statutoryInfo', required: false },
        { model: UserNominee, as: 'userNominee', required: false },
        { model: UserQualification, as: 'userQualification', required: false }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error in exportSingleEmployee:", error);
    return res.status(500).json({ error: error.message });
  }
};
