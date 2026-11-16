const CompanyAsset = require('../models/companyAsset');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.findCompanyAssets = async (req, res) => {
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
          )
        ]
      };
    }

    const { count, rows } = await CompanyAsset.findAndCountAll({
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
    console.error('Error finding company assets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addCompanyAsset = async (req, res) => {
  try {
    const { assetName, assetNumber, assetHandoverNumber, description, serialNumber, noOfItems } = req.body;
    if (!assetName || !assetName.trim()) {
      return res.status(400).json({ success: false, message: 'Asset Name is required' });
    }

    const newAsset = await CompanyAsset.create({
      assetName: assetName.trim(),
      assetNumber: assetNumber ? assetNumber.trim() : null,
      assetHandoverNumber: assetHandoverNumber ? assetHandoverNumber.trim() : null,
      description: description ? description.trim() : null,
      serialNumber: serialNumber ? serialNumber.trim() : null,
      noOfItems: noOfItems ? parseInt(noOfItems, 10) : 1
    });

    res.status(201).json(newAsset);
  } catch (error) {
    console.error('Error adding company asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCompanyAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await CompanyAsset.findByPk(id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Company Asset not found' });
    }

    const { assetName, assetNumber, assetHandoverNumber, description, serialNumber, noOfItems } = req.body;
    if (assetName !== undefined) asset.assetName = assetName.trim();
    if (assetNumber !== undefined) asset.assetNumber = assetNumber ? assetNumber.trim() : null;
    if (assetHandoverNumber !== undefined) asset.assetHandoverNumber = assetHandoverNumber ? assetHandoverNumber.trim() : null;
    if (description !== undefined) asset.description = description ? description.trim() : null;
    if (serialNumber !== undefined) asset.serialNumber = serialNumber ? serialNumber.trim() : null;
    if (noOfItems !== undefined) asset.noOfItems = noOfItems ? parseInt(noOfItems, 10) : 1;

    await asset.save();
    res.json(asset);
  } catch (error) {
    console.error('Error updating company asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCompanyAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await CompanyAsset.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Company Asset not found' });
    }
    res.json({ success: true, message: 'Company Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting company asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCompanyAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await CompanyAsset.findByPk(id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Company Asset not found' });
    }
    res.json(asset);
  } catch (error) {
    console.error('Error fetching company asset by id:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
