const nodemailer = require('nodemailer');

const sendEmail = async options => {
  const transporter = nodemailer.createTransport({
    host: process.env.MAILER_HOST,
    port: process.env.MAILER_PORT,
    auth: {
      user: process.env.MAILER_USERNAME, // generated ethereal user
      pass: process.env.MAILER_PASSWORD, // generated ethereal password
    },
  });

  // 2 DEFINE EMAIL OPTIONS
  const emailOption = {
    from: 'Kurt 👋 <kurt@Email.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };
  // 3  SEND EMAIL
  await transporter.sendMail(emailOption);
};

module.exports = sendEmail;

// create reusable transporter object using the default SMTP transport
