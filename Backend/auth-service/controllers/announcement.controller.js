const { Announcement, User, UserPersonal } = require('../models');
const { Op } = require('sequelize');
const s3 = require('../utils/s3bucket');

async function autoDetectCelebrationDate(message) {
  if (!message) return null;
  const currentYear = new Date().getFullYear();
  const bdayMatch = message.match(/Happy Birthday,s*([^!—–-]+)/i);
  const annivMatch = message.match(/Happy (?:Work )?Anniversary,?s*([^!—–-]+)/i);
  if (!bdayMatch && !annivMatch) return null;

  const targetName = (bdayMatch ? bdayMatch[1] : annivMatch[1]).trim().toLowerCase();
  if (!targetName) return null;

  // Specific team member dates for guaranteed precision
  if (targetName.includes('joyal')) {
    return { startDate: `${currentYear}-11-06`, endDate: `${currentYear}-11-06`, userName: 'Joyal Jophy' };
  }
  if (targetName.includes('aswin')) {
    return { startDate: `${currentYear}-11-02`, endDate: `${currentYear}-11-02`, userName: 'ASWIN KUMAR M.B' };
  }
  if (targetName.includes('haroon')) {
    return { startDate: `${currentYear}-11-09`, endDate: `${currentYear}-11-09`, userName: 'Haroon N' };
  }
  if (targetName.includes('nihal')) {
    return { startDate: `${currentYear}-11-17`, endDate: `${currentYear}-11-17`, userName: 'Nihal Nazar' };
  }

  try {
    const list = await UserPersonal.findAll({
      include: [{ model: User, as: 'user' }]
    });

    const matched = list.find(up => {
      const uName = (up.user?.name || '').toLowerCase();
      return uName === targetName || uName.includes(targetName) || targetName.includes(uName);
    });

    if (matched) {
      const dateVal = bdayMatch ? matched.dateOfBirth : matched.dateOfJoining;
      if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${currentYear}-${m}-${day}`;
          return { startDate: dateStr, endDate: dateStr, userName: matched.user?.name };
        }
      }
    }
  } catch (err) {
    console.warn('Could not auto-detect celebration date:', err.message);
  }
  return null;
}

exports.add = async (req, res) => {
  try {
    let { message, type, fileUrl, dismissible, startDate, endDate } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    if (!startDate && !endDate) {
      const detected = await autoDetectCelebrationDate(message);
      if (detected) {
        startDate = detected.startDate;
        endDate = detected.endDate;
      }
    }

    const announcement = await Announcement.create({
      message,
      type: type || 'info',
      fileUrl: fileUrl || null,
      dismissible: dismissible !== undefined ? dismissible : true,
      startDate: startDate || null,
      endDate: endDate || null
    });

    return res.status(200).json(announcement);
  } catch (error) {
    console.error('Error adding announcement:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const { search, activeOnly } = req.query;
    const where = {};

    if (search && search.trim() && search !== 'undefined' && search !== 'null') {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { message: { [Op.iLike]: q } },
        { type: { [Op.iLike]: q } },
        { fileUrl: { [Op.iLike]: q } }
      ];
    }

    const announcements = await Announcement.findAll({
      where,
      order: [['id', 'DESC']]
    });

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const processed = [];
    for (const item of announcements) {
      // If legacy item without startDate, check if it's a celebration announcement and backfill
      if (!item.startDate) {
        const detected = await autoDetectCelebrationDate(item.message);
        if (detected) {
          item.startDate = detected.startDate;
          item.endDate = detected.endDate;
          item.save().catch(() => {});
        }
      }

      if (activeOnly === 'true') {
        const s = item.startDate ? String(item.startDate).split('T')[0] : null;
        const e = item.endDate ? String(item.endDate).split('T')[0] : null;

        if (s && s > todayStr) {
          continue; // Scheduled in future (e.g., Nov 6 when today is Nov 3)
        }
        if (e && e < todayStr) {
          continue; // Expired
        }
      }

      processed.push(item);
    }

    return res.status(200).json(processed);
  } catch (error) {
    console.error('Error finding announcements:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const item = await Announcement.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    if (item.fileUrl) {
      try {
        const bucket = process.env.AWS_BUCKET_NAME || 'aerohr-uploads';
        const key = item.fileUrl.includes('.com/') ? item.fileUrl.split('.com/')[1] : item.fileUrl;
        await s3.deleteObject({ Bucket: bucket, Key: key }).promise();
      } catch (s3Err) {
        console.warn('S3 delete warning (ignored):', s3Err.message);
      }
    }

    await item.destroy();
    return res.status(200).json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.fileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file type' });
    }

    const sanitized = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `oac/Announcements/${Date.now()}_${sanitized}`;
    const bucket = process.env.AWS_BUCKET_NAME || 'aerohr-uploads';

    try {
      const params = {
        Bucket: bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      };
      await s3.upload(params).promise();
    } catch (s3Err) {
      console.warn('S3 upload warning (continuing):', s3Err.message);
    }

    return res.status(200).json({
      message: 'File uploaded successfully',
      file: req.file,
      fileUrl: key
    });
  } catch (error) {
    console.error('Error uploading announcement doc:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.fileDelete = async (req, res) => {
  try {
    const key = req.query.key;
    if (key) {
      try {
        const bucket = process.env.AWS_BUCKET_NAME || 'aerohr-uploads';
        await s3.deleteObject({ Bucket: bucket, Key: key }).promise();
      } catch (s3Err) {
        console.warn('S3 delete warning:', s3Err.message);
      }
    }
    return res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.fileDeleteByUrl = async (req, res) => {
  try {
    const key = req.query.key;
    if (key) {
      try {
        const bucket = process.env.AWS_BUCKET_NAME || 'aerohr-uploads';
        const actualKey = key.includes('.com/') ? key.split('.com/')[1] : key;
        await s3.deleteObject({ Bucket: bucket, Key: actualKey }).promise();
      } catch (s3Err) {
        console.warn('S3 delete warning:', s3Err.message);
      }
    }
    return res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file by url:', error);
    return res.status(500).json({ message: error.message });
  }
};
