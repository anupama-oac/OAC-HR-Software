const { UserAccount } = require('../models');

exports.add = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    let account = await UserAccount.findOne({ where: { userId } });
    if (account) {
      await account.update(req.body);
    } else {
      account = await UserAccount.create(req.body);
    }
    return res.status(200).json(account);
  } catch (error) {
    console.error('Error adding account details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.findByUserId = async (req, res) => {
  try {
    const userId = req.params.id || req.params.userId;
    const account = await UserAccount.findOne({ where: { userId } });
    return res.status(200).json(account || null);
  } catch (error) {
    console.error('Error finding account details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    let account = await UserAccount.findByPk(id);
    if (!account) {
      account = await UserAccount.findOne({ where: { userId: id } });
    }
    if (!account) {
      account = await UserAccount.create({ ...req.body, userId: id });
      return res.status(200).json(account);
    }
    await account.update(req.body);
    return res.status(200).json(account);
  } catch (error) {
    console.error('Error updating account details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const accounts = await UserAccount.findAll();
    return res.status(200).json(accounts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};