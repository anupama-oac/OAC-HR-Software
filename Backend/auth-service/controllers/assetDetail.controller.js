const AssetDetail = require('../models/assetDetail');
const Asset = require('../models/asset');
const User = require('../models/user');

exports.findDetailsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const details = await AssetDetail.findAll({
      where: { userId },
      include: [
        { model: Asset, as: 'userAsset' },
        { model: User, as: 'user', attributes: ['id', 'name', 'empNo', 'email'] }
      ],
      order: [['id', 'DESC']]
    });
    res.json(details);
  } catch (error) {
    console.error('Error finding asset details by user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addAssetDetail = async (req, res) => {
  try {
    const { userId, userAssetId, assignedDate, assets } = req.body;

    // Support batch assets array
    if (Array.isArray(assets)) {
      const results = [];
      for (const item of assets) {
        const uAssetId = item.assetId || item.userAssetId;
        if (!uAssetId) continue;

        let detail = null;
        if (item.id) {
          detail = await AssetDetail.findByPk(item.id);
          if (detail) {
            await detail.update({
              assignedDate: item.assignedDate ? new Date(item.assignedDate).toISOString().split('T')[0] : detail.assignedDate,
              returnDate: item.returnDate ? new Date(item.returnDate).toISOString().split('T')[0] : detail.returnDate,
              status: item.status === false ? 'Returned' : 'Assigned',
              note: item.note !== undefined ? item.note : detail.note
            });
          }
        }

        if (!detail) {
          detail = await AssetDetail.create({
            userId,
            userAssetId: uAssetId,
            assignedDate: item.assignedDate ? new Date(item.assignedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            status: item.status === false ? 'Returned' : 'Assigned',
            note: item.note || null
          });
        }

        const isAssigned = detail.status !== 'Returned';
        await Asset.update({ assignedStatus: isAssigned }, { where: { id: uAssetId } });
        results.push(detail);
      }
      return res.status(201).json({ success: true, data: results });
    }

    // Single item fallback
    const detail = await AssetDetail.create({
      userId,
      userAssetId,
      assignedDate: assignedDate || new Date().toISOString().split('T')[0],
      status: 'Assigned'
    });

    if (userAssetId) {
      await Asset.update({ assignedStatus: true }, { where: { id: userAssetId } });
    }

    res.status(201).json({ success: true, data: detail, ...detail.toJSON() });
  } catch (error) {
    console.error('Error adding asset detail:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAssetDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, assets } = req.body;

    if (Array.isArray(assets)) {
      const targetUserId = userId || id;
      const results = [];
      for (const item of assets) {
        const uAssetId = item.assetId || item.userAssetId;
        if (!uAssetId) continue;

        let detail = null;
        if (item.id) {
          detail = await AssetDetail.findByPk(item.id);
          if (detail) {
            await detail.update({
              assignedDate: item.assignedDate ? new Date(item.assignedDate).toISOString().split('T')[0] : detail.assignedDate,
              returnDate: item.returnDate ? new Date(item.returnDate).toISOString().split('T')[0] : detail.returnDate,
              status: item.status === false ? 'Returned' : 'Assigned',
              note: item.note !== undefined ? item.note : detail.note
            });
          }
        }

        if (!detail) {
          detail = await AssetDetail.create({
            userId: targetUserId,
            userAssetId: uAssetId,
            assignedDate: item.assignedDate ? new Date(item.assignedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            status: item.status === false ? 'Returned' : 'Assigned',
            note: item.note || null
          });
        }

        const isAssigned = detail.status !== 'Returned';
        await Asset.update({ assignedStatus: isAssigned }, { where: { id: uAssetId } });
        results.push(detail);
      }
      return res.status(200).json({ success: true, data: results });
    }

    const detail = await AssetDetail.findByPk(id);
    if (!detail) {
      return res.status(404).json({ success: false, message: 'Asset detail not found' });
    }
    await detail.update(req.body);
    res.json({ success: true, data: detail, ...detail.toJSON() });
  } catch (error) {
    console.error('Error updating asset detail:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.returnAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnDate, note } = req.body;
    const detail = await AssetDetail.findByPk(id);
    if (!detail) {
      return res.status(404).json({ success: false, message: 'Asset detail not found' });
    }

    detail.returnDate = returnDate ? new Date(returnDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    detail.status = 'Returned';
    if (note) detail.note = note;
    await detail.save();

    if (detail.userAssetId) {
      await Asset.update({ assignedStatus: false }, { where: { id: detail.userAssetId } });
    }

    res.json({ success: true, data: detail, ...detail.toJSON() });
  } catch (error) {
    console.error('Error returning asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

