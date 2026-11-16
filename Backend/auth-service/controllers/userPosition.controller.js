const { UserPosition, Designation, Team } = require('../models');

function sanitizePositionPayload(body) {
  const payload = { ...body };
  for (const numField of ['userId', 'designationId', 'teamId', 'probationPeriod', 'salary']) {
    if (numField in payload) {
      if (payload[numField] === '' || payload[numField] === undefined || payload[numField] === null || typeof payload[numField] === 'function' || isNaN(Number(payload[numField]))) {
        payload[numField] = null;
      } else {
        payload[numField] = Number(payload[numField]);
      }
    }
  }
  if ('confirmationDate' in payload) {
    if (!payload.confirmationDate || payload.confirmationDate === '' || payload.confirmationDate === 'Invalid date') {
      payload.confirmationDate = null;
    }
  }
  return payload;
}

exports.add = async (req, res) => {
  try {
    const payload = sanitizePositionPayload(req.body);
    const { userId } = payload;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    let position = await UserPosition.findOne({ where: { userId } });
    if (position) {
      await position.update(payload);
    } else {
      position = await UserPosition.create(payload);
    }
    return res.status(200).json(position);
  } catch (error) {
    console.error('Error adding position details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.findByUserId = async (req, res) => {
  try {
    const userId = req.params.id || req.params.userId;
    const position = await UserPosition.findOne({
      where: { userId },
      include: [
        {
          model: Designation,
          as: 'designation',
          required: false
        }
      ]
    });
    return res.status(200).json(position || null);
  } catch (error) {
    console.error('Error finding position details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = sanitizePositionPayload(req.body);
    let position = await UserPosition.findByPk(id);
    if (!position) {
      position = await UserPosition.findOne({ where: { userId: payload.userId || id } });
    }
    if (!position) {
      position = await UserPosition.create({ ...payload, userId: payload.userId || Number(id) });
      return res.status(200).json(position);
    }
    await position.update(payload);
    return res.status(200).json(position);
  } catch (error) {
    console.error('Error updating position details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = sanitizePositionPayload(req.body);
    let position = await UserPosition.findByPk(id);
    if (!position) {
      position = await UserPosition.findOne({ where: { userId: id } });
    }
    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }
    await position.update(payload);
    return res.status(200).json(position);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const accounts = await UserPosition.findAll({
      include: [
        {
          model: Designation,
          as: 'designation',
          required: false
        }
      ]
    });
    return res.status(200).json(accounts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
