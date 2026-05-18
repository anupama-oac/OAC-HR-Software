// emailService.js
const nodemailer = require('nodemailer');
const fromEmail = process.env.EMAIL_USER;
const password = process.env.EMAIL_PASSWORD;

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: fromEmail,
    pass: password,
  },
});

const sendApprovalRequestEmail = async ({
  to,
  adminName,
  userName,
  userEmail,
  empNo,
  requestedAt,
  approvalLink,
  dashboardLink
}) => {
  const mailOptions = {
    from: `"AeroAssist" <${fromEmail}>`,
    to,
    subject: 'New User Registration Requires Approval',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1c4768; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">AeroAssist Fintech</h1>
          <p style="color: #e0e0e0; margin: 10px 0 0;">Approval System</p>
        </div>
        
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #333;">New Registration Requires Your Approval</h2>
          
          <div style="background-color: white; border-left: 4px solid #1c4768; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1c4768; margin-top: 0;">User Details:</h3>
            <p><strong>Name:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Employee Number:</strong> ${empNo || 'Not provided'}</p>
            <p><strong>Requested At:</strong> ${requestedAt}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${approvalLink}" 
               style="background-color: #1c4768; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;
                      font-weight: bold; font-size: 16px;">
              Review & Approve
            </a>
          </div>
          
          <p style="color: #666;">
            You can also review this request from your 
            <a href="${dashboardLink}" style="color: #1c4768;">admin dashboard</a>.
          </p>
          
          <p style="color: #888; font-size: 12px; margin-top: 30px;">
            This approval request will expire in 48 hours.
          </p>
        </div>
        
        <div style="background-color: #f0f0f0; padding: 15px; text-align: center; 
                    color: #666; font-size: 12px;">
          <p>AeroAssist Fintech Approvals System</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

const sendUserConfirmationEmail = async ({ to, userName, adminEmail }) => {
  const mailOptions = {
    from: `"AeroAssist" <${fromEmail}>`,
    to,
    subject: 'Registration Received - Pending Approval',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1c4768; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">AeroAssist Fintech</h1>
          <p style="color: #e0e0e0; margin: 10px 0 0;">Welcome Aboard</p>
        </div>
        
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Hello ${userName},</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Thank you for registering with AeroAssist Fintech Approvals System. 
            Your registration has been received and is currently pending approval.
          </p>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; 
                     padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #856404; margin: 0;">
              <strong>Status:</strong> Pending Approval<br>
              <strong>Next Step:</strong> An administrator will review your account details.
            </p>
          </div>

          <p style="color: #555;">
            You will receive another email once your account has been activated.
            If you have any questions, please contact your administrator at <a href="mailto:${adminEmail}">${adminEmail}</a>.
          </p>
        </div>
        
        <div style="background-color: #f0f0f0; padding: 15px; text-align: center; 
                    color: #666; font-size: 12px;">
          <p>AeroAssist Fintech Approvals System</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

const sendForgotPasswordRequestToManager = async ({
  to,
  adminName,
  userName,
  userEmail,
  empNo,
  requestedAt,
  dashboardLink
}) => {
  const mailOptions = {
    from: `"AeroAssist" <${fromEmail}>`,
    to,
    subject: 'Password Reset Request from Employee',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1c4768; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">AeroAssist Fintech</h1>
          <p style="color: #e0e0e0; margin: 10px 0 0;">Password Reset Request</p>
        </div>
        
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Action Required: Password Reset</h2>
          <p style="color: #555;">Hello ${adminName},</p>
          <p style="color: #555;">An employee has requested a password reset. Please review the details below and take appropriate action.</p>
          
          <div style="background-color: white; border-left: 4px solid #d9534f; padding: 20px; margin: 20px 0;">
            <h3 style="color: #d9534f; margin-top: 0;">Employee Details:</h3>
            <p><strong>Name:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Employee Number:</strong> ${empNo || 'Not provided'}</p>
            <p><strong>Requested At:</strong> ${requestedAt}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardLink}" 
               style="background-color: #1c4768; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;
                      font-weight: bold; font-size: 16px;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="color: #666;">
            Please verify the identity of the employee before resetting their password.
          </p>
        </div>
        
        <div style="background-color: #f0f0f0; padding: 15px; text-align: center; 
                    color: #666; font-size: 12px;">
          <p>AeroAssist Fintech Security</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendApprovalRequestEmail,
  sendUserConfirmationEmail,
  sendForgotPasswordRequestToManager
};
