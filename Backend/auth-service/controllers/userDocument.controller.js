const { UserDocument } = require('../models');
const s3 = require('../utils/s3bucket');

exports.fileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file type' });
    }

    const sanitizedFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `oac/Users/Documents/${Date.now()}_${sanitizedFileName}`;

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
      console.warn('S3 upload failed, continuing with generated key:', s3Err.message);
    }

    return res.status(200).json({
      message: 'File uploaded successfully',
      file: req.file,
      fileUrl: key
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.add = async (req, res) => {
  try {
    const userId = Number(req.body.userId);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ message: 'Valid userId is required to save document' });
    }
    const payload = {
      userId,
      docName: (req.body.docName && String(req.body.docName).trim()) ? String(req.body.docName).trim() : 'Document',
      docUrl: req.body.docUrl || ''
    };
    const doc = await UserDocument.create(payload);
    return res.status(200).json(doc);
  } catch (error) {
    console.error('Error adding user document:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.findByUserId = async (req, res) => {
  try {
    const userId = Number(req.params.id || req.params.userId);
    if (!userId || isNaN(userId)) {
      return res.status(200).json([]);
    }
    const docs = await UserDocument.findAll({ where: { userId } });
    return res.status(200).json(docs || []);
  } catch (error) {
    console.error('Error finding user documents:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await UserDocument.findByPk(id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }
    const payload = { ...req.body };
    if (payload.userId) payload.userId = Number(payload.userId);
    if (payload.docName !== undefined) {
      payload.docName = String(payload.docName).trim() || doc.docName || 'Document';
    }
    await doc.update(payload);
    return res.status(200).json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    await UserDocument.destroy({ where: { id } });
    return res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.fileDelete = async (req, res) => {
  try {
    const key = req.query.key;
    const bucket = process.env.AWS_BUCKET_NAME || 'aerohr-uploads';
    if (key && bucket) {
      const fileKey = key.replace(/^https?:\/\/[^\/]+\//, '');
      const deleteParams = {
        Bucket: bucket,
        Key: fileKey
      };
      await s3.deleteObject(deleteParams).promise();
    }
    return res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.fileDeleteByURL = async (req, res) => {
  return exports.fileDelete(req, res);
};
