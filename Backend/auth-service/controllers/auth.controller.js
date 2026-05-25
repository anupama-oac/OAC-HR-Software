/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwtTokens = require('../utils/jsonWebToken');
const User = require('../models/user');
const { UserPosition } = require('../models');




exports.Login = async (req,res)=>{
    try {
        const { empNo, password } = req.body;
        
        const user = await User.findOne({ where: { empNo: empNo,  separated: false} });
        
        if (!user) {
            return res.json({ message: 'User not found' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.json({ message: 'Incorrect password' });
        }

        const token = jwtTokens(user);
        res.cookie('refreshtoken', token.refreshToken, { httpOnly: true });

        return res.status(200).json({
            token: token,
            role: user.roleId,
            name: user.name,
            id: user.id,
            paswordReset: user.paswordReset,
            empNo: user.empNo
        });

    } catch (error) {
        res.send(error.message);
    }
}

exports.resetPassword = async (req, res) => {
  const { password, paswordReset } = req.body;

  try {
      const hashedPassword = await bcrypt.hash(password, 10);
      let user = await User.findByPk(req.params.id);
      
      if (!user) {
          return res.send('User not found');
      }

      user.password = hashedPassword;
      user.paswordReset = paswordReset;

      await user.save();
      
      const userPos = await UserPosition.findOne({ where: {userId: user.id}});
      // const email = userPos.officialMailId;
      // const emailSubject = `Password Reset Successful`;
      // const fromEmail = process.env.EMAIL_USER;
      // const emailPassword = process.env.EMAIL_PASS;    
      // const html = `
      //   <p>Dear ${user.name},</p>
      //   <p>Your password has been successfully reset!.</p>
      //   <p>Here are your login credentials:</p>
      //   <p>Username: ${user.empNo}\nPassword: ${password}</p>
      //   <p>Please keep this information secure.</p>
      //   <p>Thank you!</p>
      // `;
      // const attachments = []
      // const token = req.headers.authorization?.split(' ')[1];
      // try {
      //   await sendEmail(token, fromEmail, emailPassword, email, emailSubject ,html, attachments);
      // } catch (emailError) {
      //   console.error('Email sending failed:', emailError);
      // }

      //   // Configure Nodemailer for sending emails
      // const transporter = nodemailer.createTransport({
      //     service: 'Gmail', 
      //     auth: {
      //       user: 'nishida@onboardaero.com',
      //       pass: 'jior rtdu epzr xadt',
      //     },
      // });

      // // Email options
      // const mailOptions = {
      //     from: 'nishida@onboardaero.com', // Replace with your email
      //     to: user.email, // Assuming the User model has an `email` field
      //     subject: 'Password Reset Successful',
      //     text: `Hello ${user.name},\n\nYour password has been successfully reset.\n\nUsername: ${user.empNo}\nPassword: ${password}\n\nPlease keep this information safe.\n\nThank you!`,
      // };

      // // Send the email
      // transporter.sendMail(mailOptions, (err, info) => {
      //     if (err) {
      //         console.error('Error sending email:', err);
      //         return res.send('Failed to send email');
      //     } else {
      //         console.log('Email sent:', info.response);
      //         res.send('Password reset successful and email sent');
      //     }
      // });
      
      res.send(user);
  } catch (error) {
      res.send(error.message);
  }
}

exports.FindUser = async (req,res) => {
    try {
      const user = await User.findAll({
        where: {id: req.params.id}
      })
      res.send(user);
    } catch (error) {
      res.send(error.message)
    }
}


