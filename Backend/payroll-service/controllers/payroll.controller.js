const Payroll = require('../models/payroll');
const PayrollLog = require('../models/payrollLog');

exports.savePayroll = async (req, res) => {
  try {
    const {
      userId,
      basic,
      hra,
      conveyanceAllowance,
      lta,
      specialAllowance,
      grossPay,
      pf,
      insurance,
      gratuity,
      netPay,
      pfDeduction,
      esi,
      incentiveDeduction
    } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    let existing = await Payroll.findOne({ where: { userId } });
    if (existing) {
      await existing.update({
        basic: basic !== undefined && basic !== '' ? basic : existing.basic,
        hra: hra !== undefined && hra !== '' ? hra : existing.hra,
        conveyanceAllowance: conveyanceAllowance !== undefined && conveyanceAllowance !== '' ? conveyanceAllowance : existing.conveyanceAllowance,
        lta: lta !== undefined && lta !== '' ? lta : existing.lta,
        specialAllowance: specialAllowance !== undefined && specialAllowance !== '' ? specialAllowance : existing.specialAllowance,
        grossPay: grossPay !== undefined && grossPay !== '' ? grossPay : existing.grossPay,
        pf: pf !== undefined && pf !== '' ? pf : existing.pf,
        insurance: insurance !== undefined && insurance !== '' ? insurance : existing.insurance,
        gratuity: gratuity !== undefined && gratuity !== '' ? gratuity : existing.gratuity,
        netPay: netPay !== undefined && netPay !== '' ? netPay : existing.netPay,
        pfDeduction: pfDeduction !== undefined && pfDeduction !== '' ? pfDeduction : existing.pfDeduction,
        esi: esi !== undefined && esi !== '' ? esi : existing.esi,
        incentiveDeduction: incentiveDeduction !== undefined && incentiveDeduction !== '' ? incentiveDeduction : existing.incentiveDeduction
      });
      return res.status(200).json(existing);
    }

    const payroll = await Payroll.create({
      userId,
      basic: basic || 0,
      hra: hra || 0,
      conveyanceAllowance: conveyanceAllowance || 0,
      lta: lta || 0,
      specialAllowance: specialAllowance || 0,
      grossPay: grossPay || 0,
      pf: pf || 0,
      insurance: insurance || 0,
      gratuity: gratuity || 0,
      netPay: netPay || grossPay || 0,
      pfDeduction: pfDeduction || 0,
      esi: esi || 0,
      incentiveDeduction: incentiveDeduction || 0
    });

    return res.status(201).json(payroll);
  } catch (error) {
    console.error('Error saving payroll:', error);
    return res.status(500).json({ message: error.message || 'Failed to save payroll' });
  }
};

const authService = require('../utils/authService');

exports.getPayrolls = async (req, res) => {
  try {
    const payrolls = await Payroll.findAll({
      order: [['id', 'ASC']]
    });
    const users = await authService.getAllActiveUsers();
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    const enriched = payrolls.map(p => {
      const data = p.toJSON ? p.toJSON() : p;
      data.user = userMap[data.userId] || { name: 'Unknown', empNo: '' };
      return data;
    });

    return res.status(200).json(enriched);
  } catch (error) {
    console.error('Error fetching payrolls:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getPayrollByUserId = async (req, res) => {
  try {
    const userId = req.params.id;
    const payroll = await Payroll.findOne({ where: { userId } });
    if (!payroll) {
      return res.status(200).json(null);
    }
    const user = await authService.getUserById(userId);
    const data = payroll.toJSON ? payroll.toJSON() : payroll;
    data.user = user || { name: 'Unknown', empNo: '' };
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching payroll by userId:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.updatePayroll = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      basic,
      hra,
      conveyanceAllowance,
      lta,
      specialAllowance,
      grossPay,
      pf,
      insurance,
      gratuity,
      netPay,
      pfDeduction,
      esi,
      incentiveDeduction
    } = req.body;

    const payroll = await Payroll.findOne({ where: { id } });
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    if (grossPay && Number(payroll.grossPay) !== Number(grossPay)) {
      try {
        await PayrollLog.create({
          userId: payroll.userId,
          oldIncome: payroll.grossPay,
          newIncome: grossPay,
          updatedDate: new Date()
        });
      } catch (logErr) {
        console.warn('Could not record payroll log:', logErr.message);
      }
    }

    await payroll.update({
      basic: basic !== undefined && basic !== '' ? basic : payroll.basic,
      hra: hra !== undefined && hra !== '' ? hra : payroll.hra,
      conveyanceAllowance: conveyanceAllowance !== undefined && conveyanceAllowance !== '' ? conveyanceAllowance : payroll.conveyanceAllowance,
      lta: lta !== undefined && lta !== '' ? lta : payroll.lta,
      specialAllowance: specialAllowance !== undefined && specialAllowance !== '' ? specialAllowance : payroll.specialAllowance,
      grossPay: grossPay !== undefined && grossPay !== '' ? grossPay : payroll.grossPay,
      pf: pf !== undefined && pf !== '' ? pf : payroll.pf,
      insurance: insurance !== undefined && insurance !== '' ? insurance : payroll.insurance,
      gratuity: gratuity !== undefined && gratuity !== '' ? gratuity : payroll.gratuity,
      netPay: netPay !== undefined && netPay !== '' ? netPay : payroll.netPay,
      pfDeduction: pfDeduction !== undefined && pfDeduction !== '' ? pfDeduction : payroll.pfDeduction,
      esi: esi !== undefined && esi !== '' ? esi : payroll.esi,
      incentiveDeduction: incentiveDeduction !== undefined && incentiveDeduction !== '' ? incentiveDeduction : payroll.incentiveDeduction
    });

    return res.status(200).json(payroll);
  } catch (error) {
    console.error('Error updating payroll:', error);
    return res.status(500).json({ message: error.message || 'Failed to update payroll' });
  }
};