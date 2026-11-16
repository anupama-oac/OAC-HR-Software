const { UserNominee } = require('../models');

exports.add = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    let nominee = await UserNominee.findOne({ where: { userId } });
    if (nominee) {
      await nominee.update(req.body);
    } else {
      nominee = await UserNominee.create(req.body);
    }
    return res.status(200).json(nominee);
  } catch (error) {
    console.error('Error adding nominee details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.findByUserId = async (req, res) => {
  try {
    const userId = req.params.id || req.params.userId;
    const nominee = await UserNominee.findOne({ where: { userId } });
    return res.status(200).json(nominee || null);
  } catch (error) {
    console.error('Error finding nominee details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    let nominee = await UserNominee.findByPk(id);
    if (!nominee) {
      nominee = await UserNominee.findOne({ where: { userId: id } });
    }
    if (!nominee) {
      nominee = await UserNominee.create({ ...req.body, userId: id });
      return res.status(200).json(nominee);
    }
    await nominee.update(req.body);
    return res.status(200).json(nominee);
  } catch (error) {
    console.error('Error updating nominee details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const list = await UserNominee.findAll();
    return res.status(200).json(list);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
