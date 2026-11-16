const axios = require('axios');
const { Promotion, UserPosition, Designation, User } = require('../models');

exports.applyPromotion = async (req, res) => {
  try {
    const { userId, designationId, newSalary, effectiveDate, promotionReason, previousSalary } = req.body;

    if (!userId || !designationId) {
      return res.status(400).json({ message: 'User ID and Designation ID are required' });
    }

    // Find current position to determine old designation
    const currentPosition = await UserPosition.findOne({ where: { userId } });
    const oldDesignationId = currentPosition?.designationId || req.body.oldDesignationId || designationId;

    // Create the promotion record
    const promotion = await Promotion.create({
      userId,
      oldDesignationId,
      designationId,
      previousSalary: previousSalary !== undefined && previousSalary !== '' ? previousSalary : 0,
      newSalary: newSalary !== undefined && newSalary !== '' ? newSalary : 0,
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      promotionReason: promotionReason || null,
      promotionDate: new Date()
    });

    // Update the user's active designation in userPosition
    if (currentPosition) {
      await currentPosition.update({ designationId });
    } else {
      await UserPosition.create({ userId, designationId });
    }

    // Sync elevated salary with payroll-service
    if (newSalary !== undefined && newSalary !== '' && Number(newSalary) > 0) {
      try {
        const payrollServiceUrl = process.env.PAYROLL_SERVICE_URL || 'http://localhost:4004';
        await axios.post(`${payrollServiceUrl}/payroll`, {
          userId,
          grossPay: Number(newSalary),
          basic: Number(newSalary)
        });
      } catch (payrollErr) {
        console.error('Non-blocking error syncing promotion salary to payroll service:', payrollErr.message);
      }
    }

    // Fetch the created promotion with associations
    const result = await Promotion.findByPk(promotion.id, {
      include: [
        { model: Designation, as: 'Designation' },
        { model: Designation, as: 'oldDesignation' }
      ]
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error applying promotion:', error);
    return res.status(500).json({ message: error.message || 'Failed to apply promotion' });
  }
};

exports.getPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.findAll({
      include: [
        { model: Designation, as: 'Designation' },
        { model: Designation, as: 'oldDesignation' },
        { model: User, as: 'user', attributes: ['id', 'name', 'empNo', 'email'] }
      ],
      order: [['effectiveDate', 'DESC'], ['id', 'DESC']]
    });
    return res.status(200).json(promotions);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getPromotionById = async (req, res) => {
  try {
    const userId = req.params.id;
    const promotions = await Promotion.findAll({
      where: { userId },
      include: [
        { model: Designation, as: 'Designation' },
        { model: Designation, as: 'oldDesignation' }
      ],
      order: [['effectiveDate', 'DESC'], ['id', 'DESC']]
    });
    return res.status(200).json(promotions);
  } catch (error) {
    console.error('Error fetching promotion history by user:', error);
    return res.status(500).json({ message: error.message });
  }
};

