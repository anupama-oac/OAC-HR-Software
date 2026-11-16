const { UserQualification } = require('../models');

exports.add = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    let qualification = await UserQualification.findOne({ where: { userId } });
    if (qualification) {
      await qualification.update(req.body);
    } else {
      qualification = await UserQualification.create(req.body);
    }
    return res.status(200).json(qualification);
  } catch (error) {
    console.error('Error adding qualification details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.findByUserId = async (req, res) => {
  try {
    const userId = req.params.id || req.params.userId;
    const qualification = await UserQualification.findOne({ where: { userId } });
    return res.status(200).json(qualification || null);
  } catch (error) {
    console.error('Error finding qualification details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    let qual = await UserQualification.findByPk(id);
    if (!qual) {
      qual = await UserQualification.findOne({ where: { userId: id } });
    }
    if (!qual) {
      qual = await UserQualification.create({ ...req.body, userId: id });
      return res.status(200).json(qual);
    }
    await qual.update(req.body);
    return res.status(200).json(qual);
  } catch (error) {
    console.error('Error updating qualification details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const list = await UserQualification.findAll();
    return res.status(200).json(list);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
