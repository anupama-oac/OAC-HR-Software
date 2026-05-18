const Joi = require('joi');

const registerValidation = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(parseInt(process.env.PASSWORD_MIN_LENGTH) || 8)
    .required(),
  name: Joi.string().min(2).max(100).required(),
  empNo: Joi.string().optional(),
  roleId: Joi.number().integer().min(1).optional()
});

const loginValidation = Joi.object({
  empNo: Joi.string().required(),
  password: Joi.string().required()
});

const changePasswordValidation = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(parseInt(process.env.PASSWORD_MIN_LENGTH) || 8)
    .required()
});

const resetPasswordValidation = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string()
    .min(parseInt(process.env.PASSWORD_MIN_LENGTH) || 8)
    .required()
});

const forgotPasswordValidation = Joi.object({
  email: Joi.string().email().required()
});

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message
    }));
    return { isValid: false, errors };
  }
  
  return { isValid: true, data: value };
};

module.exports = {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  resetPasswordValidation,
  forgotPasswordValidation,
  validate
};