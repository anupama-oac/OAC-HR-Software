/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');

const router = express.Router();

const authenticateToken = require('../../middleware/authorization');
const upload = require('../../utils/multer');

const holidayController = require('../controllers/holiday.controller');

router.post(
  '/upload',
  authenticateToken,
  upload.single('file'),
  holidayController.uploadHoliday
);

router.post(
  '/save',
  authenticateToken,
  holidayController.saveHoliday
);

router.delete(
  '/delete/:id',
  authenticateToken,
  holidayController.deleteHoliday
);

router.patch(
  '/updateholiday/:id',
  authenticateToken,
  holidayController.updateHoliday
);

router.get(
  '/find',
  holidayController.findHoliday
);

router.get(
  '/findall',
  holidayController.findAllHoliday
);

router.get(
  '/byname',
  holidayController.findByName
);

router.get(
  '/holidaybydate',
  holidayController.findHolidayByDate
);

router.get(
  '/holidaysbyyear',
  holidayController.findHolidayByYear
);

router.patch(
  '/byyear',
  holidayController.deleteHolidayByYear
);

router.patch(
  '/update/:id',
  holidayController.addComboOff
);

router.patch(
  '/updatetheupdated/:id',
  holidayController.updateComboOff
);

router.get(
  '/findcombooff/:id',
  authenticateToken,
  holidayController.findComboOff
);

module.exports = router;