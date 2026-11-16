const { StatutoryInfo } = require('../models');

const sanitizeStatutoryPayload = (body = {}) => {
  const payload = { ...body };
  if (payload.passportExpiry === '' || payload.passportExpiry === 'Invalid date') {
    payload.passportExpiry = null;
  }
  return payload;
};

exports.add = async (req, res) => {
  try {
    const payload = sanitizeStatutoryPayload(req.body);
    const { userId } = payload;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    let statutory = await StatutoryInfo.findOne({ where: { userId } });
    if (statutory) {
      await statutory.update(payload);
    } else {
      statutory = await StatutoryInfo.create(payload);
    }
    return res.status(200).json(statutory);
  } catch (error) {
    console.error('Error adding statutory info:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.findByUserId = async (req, res) => {
  try {
    const userId = req.params.id || req.params.userId;
    const statutory = await StatutoryInfo.findOne({ where: { userId } });
    return res.status(200).json(statutory || null);
  } catch (error) {
    console.error('Error finding statutory info:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = sanitizeStatutoryPayload(req.body);
    let statutory = await StatutoryInfo.findByPk(id);
    if (!statutory) {
      statutory = await StatutoryInfo.findOne({ where: { userId: id } });
    }
    if (!statutory) {
      statutory = await StatutoryInfo.create({ ...payload, userId: payload.userId || id });
      return res.status(200).json(statutory);
    }
    await statutory.update(payload);
    return res.status(200).json(statutory);
  } catch (error) {
    console.error('Error updating statutory info:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const list = await StatutoryInfo.findAll();
    return res.status(200).json(list);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
