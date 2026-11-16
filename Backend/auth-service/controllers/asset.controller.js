const Asset = require('../models/asset');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.findAssets = async (req, res) => {
  try {
    let whereClause = {};
    let limit;
    let offset;

    const hasPaging = req.query.pageSize && req.query.pageSize !== 'undefined' && req.query.page && req.query.page !== 'undefined';
    const hasSearch = req.query.search && req.query.search !== 'undefined' && req.query.search.trim() !== '';

    if (hasPaging) {
      limit = parseInt(req.query.pageSize, 10);
      offset = (parseInt(req.query.page, 10) - 1) * limit;
    }

    if (hasSearch) {
      const searchTerm = req.query.search.trim().toLowerCase();
      whereClause = {
        [Op.or]: [
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('assetName')),
            { [Op.like]: `%${searchTerm}%` }
          ),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.fn('COALESCE', sequelize.col('assetNumber'), '')),
            { [Op.like]: `%${searchTerm}%` }
          ),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.fn('COALESCE', sequelize.col('serialNumber'), '')),
            { [Op.like]: `%${searchTerm}%` }
          ),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.fn('COALESCE', sequelize.col('assetHandoverNumber'), '')),
            { [Op.like]: `%${searchTerm}%` }
          ),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.fn('COALESCE', sequelize.col('purchasedFrom'), '')),
            { [Op.like]: `%${searchTerm}%` }
          ),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.fn('COALESCE', sequelize.col('invoiceNo'), '')),
            { [Op.like]: `%${searchTerm}%` }
          )
        ]
      };
    }

    const { count, rows } = await Asset.findAndCountAll({
      where: whereClause,
      order: [[sequelize.fn('LOWER', sequelize.col('assetName')), 'ASC']],
      limit,
      offset
    });

    res.json({
      count,
      items: rows
    });
  } catch (error) {
    console.error('Error finding assets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addAsset = async (req, res) => {
  try {
    const {
      assetName,
      assetNumber,
      assetHandoverNumber,
      description,
      serialNumber,
      purchasedDate,
      purchasedFrom,
      invoiceNo,
      assignedStatus,
      status
    } = req.body;

    if (!assetName || !assetName.trim()) {
      return res.status(400).json({ success: false, message: 'Asset Name is required' });
    }

    // Parse purchasedDate if present
    let formattedDate = null;
    if (purchasedDate) {
      const parsed = new Date(purchasedDate);
      if (!isNaN(parsed.getTime())) {
        formattedDate = parsed.toISOString().split('T')[0];
      }
    }

    const newAsset = await Asset.create({
      assetName: assetName.trim(),
      assetNumber: assetNumber ? assetNumber.trim() : null,
      assetHandoverNumber: assetHandoverNumber ? assetHandoverNumber.trim() : null,
      description: description ? description.trim() : null,
      serialNumber: serialNumber ? serialNumber.trim() : null,
      purchasedDate: formattedDate,
      purchasedFrom: purchasedFrom ? purchasedFrom.trim() : null,
      invoiceNo: invoiceNo ? invoiceNo.trim() : null,
      assignedStatus: assignedStatus === true || assignedStatus === 'true',
      status: status === undefined ? true : (status === true || status === 'true')
    });

    const json = newAsset.toJSON();
    res.status(201).json({
      success: true,
      data: json,
      ...json
    });
  } catch (error) {
    console.error('Error adding asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findByPk(id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const {
      assetName,
      assetNumber,
      assetHandoverNumber,
      description,
      serialNumber,
      purchasedDate,
      purchasedFrom,
      invoiceNo,
      assignedStatus,
      status
    } = req.body;

    if (assetName !== undefined) asset.assetName = assetName.trim();
    if (assetNumber !== undefined) asset.assetNumber = assetNumber ? assetNumber.trim() : null;
    if (assetHandoverNumber !== undefined) asset.assetHandoverNumber = assetHandoverNumber ? assetHandoverNumber.trim() : null;
    if (description !== undefined) asset.description = description ? description.trim() : null;
    if (serialNumber !== undefined) asset.serialNumber = serialNumber ? serialNumber.trim() : null;
    if (purchasedDate !== undefined) {
      if (purchasedDate) {
        const parsed = new Date(purchasedDate);
        asset.purchasedDate = !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : null;
      } else {
        asset.purchasedDate = null;
      }
    }
    if (purchasedFrom !== undefined) asset.purchasedFrom = purchasedFrom ? purchasedFrom.trim() : null;
    if (invoiceNo !== undefined) asset.invoiceNo = invoiceNo ? invoiceNo.trim() : null;
    if (assignedStatus !== undefined) asset.assignedStatus = (assignedStatus === true || assignedStatus === 'true');
    if (status !== undefined) asset.status = (status === true || status === 'true');

    await asset.save();
    const json = asset.toJSON();
    res.json({
      success: true,
      data: json,
      ...json
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Asset.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findByPk(id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    res.json(asset);
  } catch (error) {
    console.error('Error fetching asset by id:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAssignedUsers = async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
