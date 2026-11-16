const PettyCash = require('../models/pettyCash');
const Expense = require('../models/expense');

const addTransaction = async (req, res) => {
  try {
    const { amount, transactionType, description, transactionDate, userId, expenseId } = req.body;
    
    // req.user is set by auth middleware
    const recordedBy = req.user.id;

    if (!['CREDIT', 'DEBIT'].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "transactionType must be 'CREDIT' or 'DEBIT'"
      });
    }

    const transaction = await PettyCash.create({
      amount,
      transactionType,
      description,
      transactionDate: transactionDate || new Date(),
      recordedBy,
      userId,
      expenseId
    });

    return res.status(201).json({
      success: true,
      message: 'Petty cash transaction added successfully',
      data: transaction
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error creating petty cash transaction'
    });
  }
};

const getTransactions = async (req, res) => {
  try {
    const transactions = await PettyCash.findAll({
      order: [['transactionDate', 'DESC'], ['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching petty cash transactions'
    });
  }
};

const getBalance = async (req, res) => {
  try {
    const transactions = await PettyCash.findAll();
    
    let balance = 0;
    transactions.forEach(t => {
      if (t.transactionType === 'CREDIT') {
        balance += t.amount;
      } else if (t.transactionType === 'DEBIT') {
        balance -= t.amount;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        balance
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error calculating balance'
    });
  }
};

const getByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const transactions = await PettyCash.findAll({
      where: { userId },
      order: [['transactionDate', 'DESC'], ['createdAt', 'DESC']]
    });
    console.log(transactions);
    
    let balance = 0;
    transactions.forEach(t => {
      if (t.transactionType === 'CREDIT') {
        balance += t.amount;
      } else if (t.transactionType === 'DEBIT') {
        balance -= t.amount;
      }
    });
    console.log(balance);
    
    return res.status(200).json({
      success: true,
      data: {
        balance,
        transactions
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching petty cash for user'
    });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, transactionType, description, transactionDate, userId, expenseId } = req.body;
    
    const transaction = await PettyCash.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (amount !== undefined) transaction.amount = amount;
    if (transactionType !== undefined) transaction.transactionType = transactionType;
    if (description !== undefined) transaction.description = description;
    if (transactionDate !== undefined) transaction.transactionDate = transactionDate;
    if (userId !== undefined) transaction.userId = userId;
    if (expenseId !== undefined) transaction.expenseId = expenseId;

    await transaction.save();

    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error updating transaction' });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await PettyCash.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const expenseId = transaction.expenseId;

    await transaction.destroy();

    if (expenseId) {
      await Expense.destroy({ where: { id: expenseId } });
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error deleting transaction' });
  }
};

module.exports = {
  addTransaction,
  getTransactions,
  getBalance,
  getByUserId,
  updateTransaction,
  deleteTransaction
};
