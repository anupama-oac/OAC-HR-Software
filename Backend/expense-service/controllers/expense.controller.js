const { Op } = require('sequelize');
const Expense = require('../models/expense');
const PettyCash = require('../models/pettyCash');
const s3 = require('../utils/s3bucket');
const { User, Role, Designation, UserPosition, Notification } = require('../../auth-service/models');

/**
 * Helper to find all user IDs with a specific role or designation keyword (e.g. 'finance manager', 'operations manager')
 */
async function getManagerUserIds(roleKeywords) {
  try {
    const keywords = Array.isArray(roleKeywords) ? roleKeywords : [roleKeywords];

    // Find designations matching keyword (case-insensitive)
    const desigWhere = {
      [Op.or]: keywords.map(kw => ({
        designationName: { [Op.iLike]: `%${kw}%` }
      }))
    };
    const designations = await Designation.findAll({ where: desigWhere, attributes: ['id'] });
    const desigIds = designations.map(d => d.id);

    // Find roles matching keyword (case-insensitive)
    const roleWhere = {
      [Op.or]: keywords.map(kw => ({
        roleName: { [Op.iLike]: `%${kw}%` }
      }))
    };
    const roles = await Role.findAll({ where: roleWhere, attributes: ['id'] });
    const roleIds = roles.map(r => r.id);

    let positionUserIds = [];
    if (desigIds.length > 0) {
      const positions = await UserPosition.findAll({
        where: { designationId: desigIds },
        attributes: ['userId']
      });
      positionUserIds = positions.map(p => p.userId).filter(Boolean);
    }

    const orConditions = [];
    if (roleIds.length > 0) orConditions.push({ roleId: roleIds });
    if (positionUserIds.length > 0) orConditions.push({ id: positionUserIds });

    if (orConditions.length === 0) return [];

    const users = await User.findAll({
      where: {
        [Op.or]: orConditions,
        separated: false
      },
      attributes: ['id', 'name', 'email']
    });

    return [...new Set(users.map(u => u.id))];
  } catch (err) {
    console.error('Error finding manager user IDs:', err);
    return [];
  }
}

/**
 * Helper to create a single notification in the database
 */
async function sendNotification(userId, message, route) {
  try {
    if (!userId) return;
    await Notification.create({
      userId,
      message,
      route: route || '/login/viewApproval/viewexpenses',
      isRead: false,
      createdAt: new Date()
    });
  } catch (err) {
    console.error(`Failed to send notification to user ${userId}:`, err.message);
  }
}

/**
 * Helper to broadcast notifications to multiple user IDs
 */
async function notifyUsers(userIds, message, route) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  for (const uid of userIds) {
    await sendNotification(uid, message, route);
  }
}

const createExpense = async (req, res) => {
  try {
    console.log('--- Incoming createExpense request ---');
    console.log('req.body:', JSON.stringify(req.body));
    console.log('req.user:', JSON.stringify(req.user));

    const { amount, description, expenseDate, paymentMode, exNo, status, url, currency } = req.body;
    
    // Only Super Admin, Finance Manager, and Operations Manager can assign expense to another employee
    const dLower = (req.user?.designationName || req.user?.roleName || '').toLowerCase().trim();
    const canAssign = req.user && (
      req.user.isSuperAdmin ||
      req.user.roleId === 1 ||
      req.user.systemRoleId === 1 ||
      dLower.includes('finance manager') ||
      dLower.includes('operations manager') ||
      dLower.includes('operation manager') ||
      dLower.includes('super admin')
    );
    const userId = (req.body.userId && canAssign) ? Number(req.body.userId) : (req.user?.id ? Number(req.user.id) : 1);
    const recordedBy = req.user?.id || userId;
    const numericAmount = isNaN(Number(amount)) ? 0 : Number(amount);

    // Generate or verify unique expense number to avoid unique constraint collision
    let expenseNumber = exNo ? exNo.trim() : '';
    if (expenseNumber) {
      const existing = await Expense.findOne({ where: { expenseNumber } });
      if (existing) {
        // Number is already taken, calculate next sequential number
        const allExpenses = await Expense.findAll({ attributes: ['expenseNumber'] });
        let maxSeq = 0;
        let prefix = 'EXP-';
        for (const exp of allExpenses) {
          if (exp.expenseNumber) {
            const num = parseInt(exp.expenseNumber.replace(/\D/g, ''), 10);
            if (!isNaN(num) && num > maxSeq) {
              maxSeq = num;
            }
          }
        }
        expenseNumber = `${prefix}${(maxSeq + 1).toString().padStart(3, '0')}`;
        console.log(`Resolved duplicate expenseNumber to: ${expenseNumber}`);
      }
    } else {
      const allExpenses = await Expense.findAll({ attributes: ['expenseNumber'] });
      let maxSeq = 0;
      let prefix = 'EXP-';
      for (const exp of allExpenses) {
        if (exp.expenseNumber) {
          const num = parseInt(exp.expenseNumber.replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
      expenseNumber = `${prefix}${(maxSeq + 1).toString().padStart(3, '0')}`;
    }

    const modeLower = (paymentMode || '').toLowerCase().trim();
    const isCard = modeLower === 'card';
    const isPettyCash = modeLower === 'petty cash' || modeLower === 'pettycash';

    let currentBalance = 0;
    if (isPettyCash && numericAmount > 0) {
      const pettyCashTransactions = await PettyCash.findAll({ where: { userId } });
      currentBalance = pettyCashTransactions.reduce((acc, curr) => {
        return curr.transactionType === 'CREDIT' ? acc + curr.amount : acc - curr.amount;
      }, 0);

      if (numericAmount > currentBalance) {
        return res.status(400).json({
          success: false,
          message: 'Error: Entered amount exceeds the available petty cash balance.'
        });
      }
    }

    // Determine initial status according to approval requirements:
    // - Card: requires Operations Manager approval -> 'Pending Operations Approval'
    // - Petty Cash: no approval needed (already debited) -> 'Completed'
    // - Not Petty Cash & Not Card (Bank Transfer, Cash, etc.): requires Finance Manager approval -> 'Pending Finance Approval'
    let initialStatus = status;
    if (!initialStatus || initialStatus === 'Generated' || initialStatus === 'Pending') {
      if (isCard) {
        initialStatus = 'Pending Operations Approval';
      } else if (isPettyCash) {
        initialStatus = 'Completed';
      } else {
        initialStatus = 'Pending Finance Approval';
      }
    }

    const expense = await Expense.create({
      expenseNumber,
      userId,
      amount: numericAmount,
      description: description || null,
      expenseDate: expenseDate || new Date(),
      paymentMode: paymentMode || 'Cash',
      status: initialStatus,
      currency: currency || 'INR',
      url: Array.isArray(url) ? url : (url ? [url] : [])
    });

    if (isPettyCash && numericAmount > 0) {
      await PettyCash.create({
        amount: numericAmount,
        transactionType: 'DEBIT',
        description: `Expense: ${description || 'No description'}`,
        transactionDate: expenseDate || new Date(),
        recordedBy: recordedBy,
        userId: userId,
        expenseId: expense.id
      });
    }

    // Trigger Notifications:
    // 1. If paymentMode is pettyCash -> send notification to FinanceManager
    // 2. If paymentMode is card -> requires approval from OperationsManager (send notification to OperationsManager)
    // 3. If paymentMode is not pettyCash or card -> requires FinanceManager approval (send notification to FinanceManager)
    const empUser = await User.findByPk(userId, { attributes: ['id', 'name', 'empNo'] });
    const empName = empUser ? empUser.name : (req.user?.name || 'Employee');
    const formattedAmount = `${numericAmount} ${currency || 'INR'}`;
    const expenseRoute = `/login/viewApproval/openexpenses/${expense.id}`;

    if (isPettyCash) {
      const fmIds = await getManagerUserIds(['finance manager', 'finance mgr']);
      const msg = `New Petty Cash expense ${expenseNumber} (${formattedAmount}) recorded for ${empName}.`;
      await notifyUsers(fmIds, msg, expenseRoute);
    } else if (isCard) {
      const omIds = await getManagerUserIds(['operations manager', 'operation manager', 'operations mgr']);
      const msg = `New Card expense ${expenseNumber} (${formattedAmount}) submitted by ${empName} requires your approval.`;
      await notifyUsers(omIds, msg, expenseRoute);
    } else {
      const fmIds = await getManagerUserIds(['finance manager', 'finance mgr']);
      const msg = `New ${paymentMode || 'Standard'} expense ${expenseNumber} (${formattedAmount}) submitted by ${empName} requires your approval.`;
      await notifyUsers(fmIds, msg, expenseRoute);
    }

    return res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense
    });
  } catch (error) {
    console.error('Error in createExpense:', error);
    if (error.errors && Array.isArray(error.errors)) {
      console.error('Validation errors array:', error.errors.map(e => ({ path: e.path, message: e.message, type: e.type, value: e.value })));
    }
    const details = error.errors && Array.isArray(error.errors)
      ? error.errors.map(e => `${e.path || e.type}: ${e.message}`).join(', ')
      : error.message;
    return res.status(500).json({
      success: false,
      message: details || 'Error creating expense'
    });
  }
};

const getUserExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const rawExpenses = await Expense.findAll({ where: { userId } });
    
    const users = await User.findAll({
      where: { id: [userId] },
      include: [{ model: Role, as: 'role' }]
    });

    const userMap = {};
    users.forEach(u => userMap[u.id] = u);

    const expenses = rawExpenses.map(e => {
      const expenseData = e.toJSON();
      expenseData.user = userMap[e.userId] || null;
      return expenseData;
    });

    return res.status(200).json({
      success: true,
      data: expenses
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching expenses'
    });
  }
};

const getAllExpenses = async (req, res) => {
  try {
    const userRole = (req.user?.roleName || '').toLowerCase().trim();
    const userDesig = (req.user?.designationName || '').toLowerCase().trim();

    const isSuperAdmin = Boolean(
      req.user?.isSuperAdmin ||
      req.user?.roleId === 1 ||
      req.user?.systemRoleId === 1 ||
      userRole.includes('super admin') ||
      userRole.includes('administrator') ||
      userDesig.includes('super admin')
    );
    const isFinanceMgr = userRole.includes('finance manager') || userDesig.includes('finance manager');
    const isOperationsMgr =
      userRole.includes('operations manager') ||
      userRole.includes('operation manager') ||
      userDesig.includes('operations manager') ||
      userDesig.includes('operation manager');

    const canViewAll = isSuperAdmin || isFinanceMgr || isOperationsMgr;

    // For all others show expenses added by their own only
    const whereClause = canViewAll ? {} : { userId: req.user.id };

    const rawExpenses = await Expense.findAll({
      where: whereClause,
      order: [['id', 'DESC']]
    });
    
    const userIds = [...new Set(rawExpenses.map(e => e.userId))];
    const users = await User.findAll({
      where: { id: userIds },
      include: [{ model: Role, as: 'role' }]
    });

    const userMap = {};
    users.forEach(u => userMap[u.id] = u);

    const expenses = rawExpenses.map(e => {
      const expenseData = e.toJSON();
      expenseData.user = userMap[e.userId] || null;
      return expenseData;
    });
    
    return res.status(200).json({
      success: true,
      data: expenses
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching all expenses'
    });
  }
};

const updateExpenseStatus = async (req, res) => {
  try {
    const id = req.params.id || req.body.id || req.body.expenseId;
    const { status, remarks, value } = req.body;

    const expense = await Expense.findByPk(id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const modeLower = (expense.paymentMode || '').toLowerCase().trim();
    const isCard = modeLower === 'card';
    const isPettyCash = modeLower === 'petty cash' || modeLower === 'pettycash';

    const userRole = (req.user?.roleName || '').toLowerCase().trim();
    const userDesig = (req.user?.designationName || '').toLowerCase().trim();
    const isSuperAdmin = Boolean(
      req.user?.isSuperAdmin ||
      req.user?.roleId === 1 ||
      req.user?.systemRoleId === 1 ||
      userRole.includes('super admin') ||
      userRole.includes('administrator') ||
      userDesig.includes('super admin')
    );
    const isFinanceMgr = userRole.includes('finance manager') || userDesig.includes('finance manager');
    const isOperationsMgr =
      userRole.includes('operations manager') ||
      userRole.includes('operation manager') ||
      userDesig.includes('operations manager') ||
      userDesig.includes('operation manager');

    let canApproveThis = false;
    if (isSuperAdmin) {
      canApproveThis = true;
    } else if (isCard && isOperationsMgr) {
      canApproveThis = true;
    } else if (!isCard && !isPettyCash && isFinanceMgr) {
      canApproveThis = true;
    }

    if (!canApproveThis) {
      return res.status(403).json({
        success: false,
        message: isCard
          ? 'Only Operations Manager (or Super Admin) can approve or reject Card expenses.'
          : 'Only Finance Manager (or Super Admin) can approve or reject this expense.'
      });
    }

    // Determine final status
    let finalStatus = status;
    const isApprove = value === 'approved' || (status && (status.toLowerCase().includes('approved') || status.toLowerCase().includes('verified')));
    const isReject = value === 'rejected' || (status && status.toLowerCase().includes('rejected'));

    if (isApprove) {
      finalStatus = isCard ? 'OM Approved' : 'FM Approved';
    } else if (isReject) {
      finalStatus = isCard ? 'OM Rejected' : 'FM Rejected';
    }

    expense.status = finalStatus || status;
    await expense.save();

    // Send notification to the expense owner
    const actionText = isApprove ? 'approved and amount transferred' : (isReject ? 'reverted back to you' : 'updated');
    let approverTitle = 'Management';
    if (isOperationsMgr) approverTitle = 'Operations Manager';
    else if (isFinanceMgr) approverTitle = 'Finance Manager';
    else if (isSuperAdmin) approverTitle = 'Super Administrator';

    const employeeRoute = `/login/viewApproval/openexpenses/${expense.id}`;
    const notifMsg = `Your ${expense.paymentMode || ''} expense ${expense.expenseNumber} has been ${actionText} by ${approverTitle}${remarks ? `: "${remarks}"` : '.'}`;
    await sendNotification(expense.userId, notifMsg, employeeRoute);

    return res.status(200).json({
      success: true,
      message: `Expense status updated to ${expense.status}`,
      data: expense
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating expense status'
    });
  }
};

const fileUpload = async (req, res) => {
  try {
    const file = req.file;    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const fileExtension = file.originalname.split('.').pop();

    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExtension}`;

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME || 'aerohr-uploads',
      Key: `oac/expenses/${fileName}`,
      Body: file.buffer,
      ContentType: file.mimetype
    };

    const data = await s3.upload(params).promise();

    return res.status(200).json({
      success: true,
      fileUrl: data.Location,
      key: data.Key,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('S3 upload error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Error uploading file'
    });
  }
};


const getExpenseById = async (req, res) => {
  try {
    const id = req.params.id;
    const rawExpense = await Expense.findByPk(id);
    console.log(rawExpense);
    
    if (!rawExpense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const userRole = (req.user?.roleName || '').toLowerCase().trim();
    const userDesig = (req.user?.designationName || '').toLowerCase().trim();
    const isSuperAdmin = Boolean(
      req.user?.isSuperAdmin ||
      req.user?.roleId === 1 ||
      req.user?.systemRoleId === 1 ||
      userRole.includes('super admin') ||
      userRole.includes('administrator') ||
      userDesig.includes('super admin')
    );
    const isFinanceMgr = userRole.includes('finance manager') || userDesig.includes('finance manager');
    const isOperationsMgr =
      userRole.includes('operations manager') ||
      userRole.includes('operation manager') ||
      userDesig.includes('operations manager') ||
      userDesig.includes('operation manager');

    const canViewAll = isSuperAdmin || isFinanceMgr || isOperationsMgr;
    if (!canViewAll && rawExpense.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to view expenses added by yourself.'
      });
    }

    const user = await User.findByPk(rawExpense.userId, {
      include: [{ model: Role, as: 'role' }]
    });

    const expenseData = rawExpense.toJSON();
    expenseData.user = user || null;
    
    // Simulate what the frontend expects
    let signedUrl = [];
    if (expenseData.url && Array.isArray(expenseData.url)) {
      signedUrl = expenseData.url.map(urlObj => ({ url: urlObj, remarks: '' }));
    }

    // Include dummy expensestatuses since it was required by frontend
    expenseData.expensestatuses = expenseData.expensestatuses || [];

    return res.status(200).json({
      success: true,
      pi: expenseData,
      signedUrl: signedUrl
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching expense'
    });
  }
};

const updateExpense = async (req, res) => {
  try {
    const id = req.params.id;
    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const userRole = (req.user?.roleName || '').toLowerCase().trim();
    const userDesig = (req.user?.designationName || '').toLowerCase().trim();
    const isSuperAdmin = Boolean(
      req.user?.isSuperAdmin ||
      req.user?.roleId === 1 ||
      req.user?.systemRoleId === 1 ||
      userRole.includes('super admin') ||
      userRole.includes('administrator') ||
      userDesig.includes('super admin')
    );
    const isFinanceMgr = userRole.includes('finance manager') || userDesig.includes('finance manager');
    const isOperationsMgr =
      userRole.includes('operations manager') ||
      userRole.includes('operation manager') ||
      userDesig.includes('operations manager') ||
      userDesig.includes('operation manager');

    const canManageAll = isSuperAdmin || isFinanceMgr || isOperationsMgr;
    if (!canManageAll && expense.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to delete expenses added by yourself.'
      });
    }

    const { amount, description, notes, expenseDate, paymentMode, exNo, expenseNumber, status, url, userId, currency } = req.body;
    
    // Front end sends `notes` or `description` depending on the interface
    const desc = description || notes;
    const exN = exNo || expenseNumber;

    const oldPaymentMode = expense.paymentMode;
    const oldAmount = expense.amount;
    const oldDescription = expense.description;
    const oldUserId = expense.userId;

    const newPaymentMode = paymentMode !== undefined ? paymentMode : oldPaymentMode;
    const newAmount = amount !== undefined ? amount : oldAmount;
    const dLower = (req.user?.designationName || req.user?.roleName || '').toLowerCase().trim();
    const canManageAnyUserExpense = req.user && (
      req.user.isSuperAdmin ||
      req.user.roleId === 1 ||
      req.user.systemRoleId === 1 ||
      req.user.roleId === 4 ||
      req.user.roleId === 5 ||
      dLower.includes('finance manager') ||
      dLower.includes('operations manager') ||
      dLower.includes('operation manager') ||
      dLower.includes('super admin')
    );

    if (!canManageAnyUserExpense && expense.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to edit expenses added by yourself.'
      });
    }
    const newUserId = (userId !== undefined && canManageAnyUserExpense) ? userId : oldUserId;
    const newDesc = desc !== undefined ? desc : oldDescription;
    const newExpenseDate = expenseDate !== undefined ? expenseDate : expense.expenseDate;

    // Check Petty Cash Balance if needed
    if (newPaymentMode === 'Petty Cash' && newAmount > 0) {
      const pettyCashTransactions = await PettyCash.findAll({ where: { userId: newUserId } });
      let currentBalance = pettyCashTransactions.reduce((acc, curr) => {
        return curr.transactionType === 'CREDIT' ? acc + curr.amount : acc - curr.amount;
      }, 0);

      // If it was already Petty Cash for the same user, the old amount was already deducted.
      // We add it back to find the true available balance before this expense.
      if (oldPaymentMode === 'Petty Cash' && oldUserId === newUserId) {
        currentBalance += oldAmount;
      }

      if (newAmount > currentBalance) {
        return res.status(400).json({
          success: false,
          message: 'Error: Entered amount exceeds the available petty cash balance.'
        });
      }
    }

    // Apply updates to the expense
    if (amount !== undefined) expense.amount = amount;
    if (desc !== undefined) expense.description = desc;
    if (expenseDate !== undefined) expense.expenseDate = expenseDate;
    if (paymentMode !== undefined) expense.paymentMode = paymentMode;
    if (exN !== undefined) expense.expenseNumber = exN;
    if (status !== undefined) expense.status = status;
    if (url !== undefined) expense.url = Array.isArray(url) ? url : (url ? [url] : []);
    if (currency !== undefined) expense.currency = currency;
    if (userId !== undefined && canManageAnyUserExpense) expense.userId = userId;

    await expense.save();

    // Synchronize Petty Cash Records
    if (oldPaymentMode === 'Petty Cash') {
      const pettyCashRecord = await PettyCash.findOne({
        where: {
          userId: oldUserId,
          amount: oldAmount,
          transactionType: 'DEBIT',
          description: `Expense: ${oldDescription || 'No description'}`
        }
      });

      if (pettyCashRecord) {
        if (newPaymentMode !== 'Petty Cash' || oldUserId !== newUserId) {
          // If payment mode changed, or assigned to a different user, remove the old petty cash debit
          await pettyCashRecord.destroy();
          
          // If it's still petty cash but for a new user, create a new record
          if (newPaymentMode === 'Petty Cash') {
            await PettyCash.create({
              amount: newAmount,
              transactionType: 'DEBIT',
              description: `Expense: ${newDesc || 'No description'}`,
              transactionDate: newExpenseDate || new Date(),
              recordedBy: req.user ? req.user.id : newUserId,
              userId: newUserId
            });
          }
        } else {
          if (oldAmount !== newAmount) {
            // Refund the old amount
            await PettyCash.create({
              amount: oldAmount,
              transactionType: 'CREDIT',
              description: `Refund for updated Expense: ${oldDescription || 'No description'}`,
              transactionDate: new Date(),
              recordedBy: req.user ? req.user.id : newUserId,
              userId: oldUserId
            });
            // Debit the new amount
            await PettyCash.create({
              amount: newAmount,
              transactionType: 'DEBIT',
              description: `Expense: ${newDesc || 'No description'}`,
              transactionDate: newExpenseDate || new Date(),
              recordedBy: req.user ? req.user.id : newUserId,
              userId: newUserId
            });
          } else {
            // Update the existing petty cash record if amount hasn't changed
            pettyCashRecord.description = `Expense: ${newDesc || 'No description'}`;
            pettyCashRecord.transactionDate = newExpenseDate || new Date();
            await pettyCashRecord.save();
          }
        }
      }
    } else if (newPaymentMode === 'Petty Cash') {
      // Payment mode changed TO Petty Cash from something else
      await PettyCash.create({
        amount: newAmount,
        transactionType: 'DEBIT',
        description: `Expense: ${newDesc || 'No description'}`,
        transactionDate: newExpenseDate || new Date(),
        recordedBy: req.user ? req.user.id : newUserId,
        userId: newUserId
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating expense'
    });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const id = req.params.id;
    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const userRole = (req.user?.roleName || '').toLowerCase().trim();
    const userDesig = (req.user?.designationName || '').toLowerCase().trim();
    const isSuperAdmin = Boolean(
      req.user?.isSuperAdmin ||
      req.user?.roleId === 1 ||
      req.user?.systemRoleId === 1 ||
      userRole.includes('super admin') ||
      userRole.includes('administrator') ||
      userDesig.includes('super admin')
    );
    const isFinanceMgr = userRole.includes('finance manager') || userDesig.includes('finance manager');
    const isOperationsMgr =
      userRole.includes('operations manager') ||
      userRole.includes('operation manager') ||
      userDesig.includes('operations manager') ||
      userDesig.includes('operation manager');

    const canManageAll = isSuperAdmin || isFinanceMgr || isOperationsMgr;
    if (!canManageAll && expense.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to delete expenses added by yourself.'
      });
    }

    // Refund petty cash if it was a petty cash expense
    if (expense.paymentMode === 'Petty Cash' && expense.amount > 0) {
      await PettyCash.create({
        amount: expense.amount,
        transactionType: 'CREDIT',
        description: `Refund for deleted Expense: ${expense.description || 'No description'}`,
        transactionDate: new Date(),
        recordedBy: req.user ? req.user.id : expense.userId,
        userId: expense.userId
      });
    }

    await expense.destroy();

    return res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting expense'
    });
  }
};

module.exports = {
  createExpense,
  getAllExpenses,
  getUserExpenses,
  updateExpenseStatus,
  fileUpload,
  getExpenseById,
  updateExpense,
  deleteExpense
};
