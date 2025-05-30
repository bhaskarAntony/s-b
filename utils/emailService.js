import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'sportigov@gmail.com',
    pass: process.env.EMAIL_PASS || 'tpwiaghvtskcnmwe', // Use app-specific password
  },
});

// Generic send email function
const sendEmail = async ({ to, subject, html }) => {
  try {
    const mailOptions = {
      from: `"SPORTI Club" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Format date for email display
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Email service object
const emailService = {
  // Send OTP email for login
  async sendOTPEmail(user, otp) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #0056b3;">SPORTI Club - Login OTP</h2>
        <p>Dear ${user.name},</p>
        <p>Your One-Time Password (OTP) for logging into SPORTI Club is:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center;">
          <h3 style="color: #0056b3; margin: 0;">${otp}</h3>
        </div>
        <p>This OTP is valid for 10 minutes. Please do not share it with anyone.</p>
        <p>If you did not request this OTP, please contact the club administration.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
          <p>SPORTI Club Management</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'SPORTI Club - Your Login OTP',
      html,
    });
  },

  // Send registration email with credentials
  async sendRegistrationEmail(user, password) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #0056b3;">Welcome to SPORTI Club!</h2>
        <p>Dear ${user.name},</p>
        <p>Your SPORTI Club account has been successfully created. Below are your login credentials:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        <p>Please change your password after your first login for security purposes.</p>
        <p>Login here: <a href="http://localhost:3000/login" style="color: #0056b3;">SPORTI Club Login</a></p>
        <p>If you have any questions, contact our support team.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
          <p>SPORTI Club Management</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'SPORTI Club - Your Account Details',
      html,
    });
  },

  // Send booking submission email
  async sendBookingSubmissionEmail(booking, user = null, nonMemberEmail = null) {
    const isMember = !!user;
    const recipient = isMember ? user.email : nonMemberEmail;
    const name = isMember ? user.name : booking.occupantDetails.name;
    const bookingId = booking.applicationNumber || booking._id;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #0056b3;">SPORTI Club - Booking Request Received</h2>
        <p>Dear ${name},</p>
        <p>Your booking request has been successfully submitted. Our team will review and confirm your booking soon.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Type:</strong> ${booking.bookingType}</p>
          <p><strong>Location:</strong> ${booking.sporti}</p>
          <p><strong>Check-In:</strong> ${formatDate(booking.checkIn)}</p>
          <p><strong>Check-Out:</strong> ${formatDate(booking.checkOut)}</p>
          <p><strong>Status:</strong> ${booking.status}</p>
          ${!isMember ? `<p><strong>Officer Name:</strong> ${booking.officerDetails.name}</p>` : ''}
        </div>
        <p>You will receive a confirmation email once your booking is approved.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
          <p>SPORTI Club Management</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: recipient,
      subject: `SPORTI Club - Booking Request Submitted (${bookingId})`,
      html,
    });
  },

  // Send booking confirmation email
  async sendBookingConfirmationEmail(booking, user = null, rooms = [], nonMemberEmail = null) {
    const isMember = !!user;
    const recipient = isMember ? user.email : nonMemberEmail;
    const name = isMember ? user.name : booking.occupantDetails.name;
    const bookingId = booking.applicationNumber || booking._id;

    const roomDetails = rooms && rooms.length > 0
      ? rooms.map(room => `
          <p><strong>Room Number:</strong> ${room.roomNumber}</p>
          <p><strong>Category:</strong> ${room.category}</p>
          <p><strong>Floor:</strong> ${room.floor}</p>
        `).join('')
      : '<p><strong>Room:</strong> To be assigned</p>';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #0056b3;">SPORTI Club - Booking Confirmed</h2>
        <p>Dear ${name},</p>
        <p>Your booking has been confirmed. Below are the details:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Type:</strong> ${booking.bookingType}</p>
          <p><strong>Location:</strong> ${booking.sporti}</p>
          <p><strong>Check-In:</strong> ${formatDate(booking.checkIn)}</p>
          <p><strong>Check-Out:</strong> ${formatDate(booking.checkOut)}</p>
          ${roomDetails}
          <p><strong>Total Cost:</strong> ₹${booking.totalCost.toLocaleString()}</p>
          ${!isMember ? `<p><strong>Officer Name:</strong> ${booking.officerDetails.name}</p>` : ''}
        </div>
        <p>Please ensure payment is completed ${isMember ? 'online or ' : ''}at check-in. Contact us for any queries.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
          <p>SPORTI Club Management</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: recipient,
      subject: `SPORTI Club - Booking Confirmation (${bookingId})`,
      html,
    });
  },

  // Send booking status update email (rejected, cancelled, completed)
  async sendBookingStatusEmail(booking, user = null, statusMessage, nonMemberEmail = null) {
    const isMember = !!user;
    const recipient = isMember ? user.email : nonMemberEmail;
    const name = isMember ? user.name : booking.occupantDetails.name;
    const bookingId = booking.applicationNumber || booking._id;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #0056b3;">SPORTI Club - Booking Status Update</h2>
        <p>Dear ${name},</p>
        <p>${statusMessage}</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Type:</strong> ${booking.bookingType}</p>
          <p><strong>Location:</strong> ${booking.sporti}</p>
          <p><strong>Check-In:</strong> ${formatDate(booking.checkIn)}</p>
          <p><strong>Check-Out:</strong> ${formatDate(booking.checkOut)}</p>
          <p><strong>Status:</strong> ${booking.status}</p>
          ${booking.remarks ? `<p><strong>Remarks:</strong> ${booking.remarks}</p>` : ''}
          ${!isMember ? `<p><strong>Officer Name:</strong> ${booking.officerDetails.name}</p>` : ''}
        </div>
        <p>Please contact us if you have any questions.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
          <p>SPORTI Club Management</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: recipient,
      subject: `SPORTI Club - Booking Status Update (${bookingId})`,
      html,
    });
  },

  // Send payment confirmation email
  async sendPaymentConfirmationEmail(booking, user = null, nonMemberEmail = null) {
    const isMember = !!user;
    const recipient = isMember ? user.email : nonMemberEmail;
    const name = isMember ? user.name : booking.occupantDetails.name;
    const bookingId = booking.applicationNumber || booking._id;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #0056b3;">SPORTI Club - Payment Confirmation</h2>
        <p>Dear ${name},</p>
        <p>We have successfully received your payment for the following booking:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Type:</strong> ${booking.bookingType}</p>
          <p><strong>Location:</strong> ${booking.sporti}</p>
          <p><strong>Check-In:</strong> ${formatDate(booking.checkIn)}</p>
          <p><strong>Check-Out:</strong> ${formatDate(booking.checkOut)}</p>
          <p><strong>Amount Paid:</strong> ₹${booking.totalCost.toLocaleString()}</p>
          ${!isMember ? `<p><strong>Officer Name:</strong> ${booking.officerDetails.name}</p>` : ''}
        </div>
        <p>Thank you for your payment. We look forward to hosting you!</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
          <p>SPORTI Club Management</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: recipient,
      subject: `SPORTI Club - Payment Confirmation (${bookingId})`,
      html,
    });
  },

  // Send check-in confirmation email
  async sendCheckInEmail(booking, user = null, nonMemberEmail = null) {
    const isMember = !!user;
    const recipient = isMember ? user.email : nonMemberEmail;
    const name = isMember ? user.name : booking.occupantDetails.name;
    const bookingId = booking.applicationNumber || booking._id;

    const roomDetails = booking.roomId
      ? `
          <p><strong>Room Number:</strong> ${booking.roomId.roomNumber}</p>
          <p><strong>Category:</strong> ${booking.roomId.category}</p>
          <p><strong>Floor:</strong> ${booking.roomId.floor}</p>
        `
      : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #0056b3;">SPORTI Club - Check-In Confirmation</h2>
        <p>Dear ${name},</p>
        <p>Welcome to SPORTI Club! Your check-in has been successfully completed.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Location:</strong> ${booking.sporti}</p>
          <p><strong>Check-In Date:</strong> ${formatDate(booking.checkIn)}</p>
          ${roomDetails}
          ${!isMember ? `<p><strong>Officer Name:</strong> ${booking.officerDetails.name}</p>` : ''}
        </div>
        <p>We hope you enjoy your stay. Please contact our staff for any assistance.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
          <p>SPORTI Club Management</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: recipient,
      subject: `SPORTI Club - Check-In Confirmation (${bookingId})`,
      html,
    });
  },

  // Send check-out confirmation email
  async sendCheckOutEmail(booking, user = null, nonMemberEmail = null) {
    const isMember = !!user;
    const recipient = isMember ? user.email : nonMemberEmail;
    const name = isMember ? user.name : booking.occupantDetails.name;
    const bookingId = booking.applicationNumber || booking._id;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #0056b3;">SPORTI Club - Check-Out Confirmation</h2>
        <p>Dear ${name},</p>
        <p>Your check-out has been successfully completed. We hope you had a pleasant stay at SPORTI Club.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Location:</strong> ${booking.sporti}</p>
          <p><strong>Check-Out Date:</strong> ${formatDate(booking.checkOut)}</p>
          ${!isMember ? `<p><strong>Officer Name:</strong> ${booking.officerDetails.name}</p>` : ''}
        </div>
        <p>We look forward to welcoming you back soon. Please share your feedback with us.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
          <p>SPORTI Club Management</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: recipient,
      subject: `SPORTI Club - Check-Out Confirmation (${bookingId})`,
      html,
    });
  },
};

export default emailService;