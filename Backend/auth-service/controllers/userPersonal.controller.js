const { Op } = require('sequelize');
const { UserPersonal, User, CelebrationWish } = require('../models');

function normalizeDate(val) {
  if (!val || val === '' || val === 'Invalid date') return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }
  // Handle DD/MM/YYYY format if sent as string
  if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val.trim())) {
    const [dd, mm, yyyy] = val.trim().split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sanitizePersonalPayload(body) {
  const payload = { ...body };

  if (payload.userId !== undefined && payload.userId !== null && payload.userId !== '') {
    payload.userId = Number(payload.userId);
  }

  if (
    payload.reportingMangerId === '' ||
    payload.reportingMangerId === undefined ||
    payload.reportingMangerId === null ||
    isNaN(Number(payload.reportingMangerId))
  ) {
    payload.reportingMangerId = null;
  } else {
    payload.reportingMangerId = Number(payload.reportingMangerId);
  }

  payload.dateOfJoining = normalizeDate(payload.dateOfJoining);
  payload.dateOfBirth = normalizeDate(payload.dateOfBirth);
  if ('confirmationDate' in payload) {
    payload.confirmationDate = normalizeDate(payload.confirmationDate);
  }

  payload.maritalStatus = payload.maritalStatus || '';
  payload.gender = payload.gender || '';

  return payload;
}

exports.add = async (req, res) => {
  try {
    const payload = sanitizePersonalPayload(req.body);
    const { userId } = payload;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    let personal = await UserPersonal.findOne({ where: { userId } });
    if (personal) {
      await personal.update(payload);
    } else {
      personal = await UserPersonal.create(payload);
    }
    return res.status(200).json(personal);
  } catch (error) {
    console.error('Error adding personal details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.findByUserId = async (req, res) => {
  try {
    const userId = req.params.id || req.params.userId;
    const personal = await UserPersonal.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: 'ReportingManager',
          attributes: ['id', 'name', 'empNo'],
          required: false
        }
      ]
    });

    if (!personal) {
      return res.status(200).json(null);
    }

    const result = personal.toJSON();
    if (result.ReportingManager) {
      result.manager = result.ReportingManager;
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error finding personal details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = sanitizePersonalPayload(req.body);
    let personal = await UserPersonal.findByPk(id);
    if (!personal) {
      personal = await UserPersonal.findOne({ where: { userId: payload.userId || id } });
    }
    if (!personal) {
      personal = await UserPersonal.create({ ...payload, userId: payload.userId || Number(id) });
      return res.status(200).json(personal);
    }
    await personal.update(payload);
    return res.status(200).json(personal);
  } catch (error) {
    console.error('Error updating personal details:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const list = await UserPersonal.findAll();
    return res.status(200).json(list);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.birthdays = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const list = await UserPersonal.findAll({
      where: {
        dateOfBirth: { [Op.ne]: null }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'empNo', 'email', 'userImage', 'url', 'status', 'separated'],
          where: { separated: false },
          required: true,
          include: [
            {
              model: CelebrationWish,
              as: 'celebrationWishes',
              where: { type: 'birthday', year: currentYear },
              required: false
            }
          ]
        }
      ]
    });
    return res.status(200).json(list);
  } catch (error) {
    console.error('Error loading birthdays:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.joiningDays = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const list = await UserPersonal.findAll({
      where: {
        dateOfJoining: { [Op.ne]: null }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'empNo', 'email', 'userImage', 'url', 'status', 'separated'],
          where: { separated: false },
          required: true,
          include: [
            {
              model: CelebrationWish,
              as: 'celebrationWishes',
              where: { type: 'anniversary', year: currentYear },
              required: false
            }
          ]
        }
      ]
    });
    return res.status(200).json(list);
  } catch (error) {
    console.error('Error loading joiningDays:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.dueProbation = async (req, res) => {
  try {
    const list = await User.findAll({
      where: { isTemporary: true, separated: false },
      include: [{ model: UserPersonal, as: 'userPersonal' }]
    });
    return res.status(200).json(list);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getWishes = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const wishes = await CelebrationWish.findAll({
      where: { year },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'empNo', 'email', 'userImage', 'url'],
          required: false
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    return res.status(200).json(wishes || []);
  } catch (error) {
    console.error('Error fetching celebration wishes:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.saveWish = async (req, res) => {
  try {
    const { userId, type = 'birthday', title, message, imageUrl, createdBy } = req.body;
    const numericUserId = Number(userId);
    if (!numericUserId || !message) {
      return res.status(400).json({ message: 'Employee userId and wish message are required' });
    }

    const year = Number(req.body.year) || new Date().getFullYear();
    let wish = await CelebrationWish.findOne({
      where: { userId: numericUserId, type, year }
    });

    if (wish) {
      await wish.update({
        title: title || wish.title,
        message,
        imageUrl: imageUrl !== undefined ? imageUrl : wish.imageUrl,
        createdBy: createdBy || wish.createdBy
      });
    } else {
      wish = await CelebrationWish.create({
        userId: numericUserId,
        type,
        title: title || (type === 'anniversary' ? 'Happy Work Anniversary!' : 'Happy Birthday!'),
        message,
        imageUrl: imageUrl || null,
        year,
        createdBy: createdBy || 'Team OAC'
      });
    }

    return res.status(200).json(wish);
  } catch (error) {
    console.error('Error saving celebration wish:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteWish = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await CelebrationWish.destroy({ where: { id } });
    return res.status(200).json({ message: 'Celebration wish deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
