const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'labfaceassistance@gmail.com',
        pass: 'hhlvefystkihubxk'
    }
});

// Verify SMTP connection (non-blocking)
transporter.verify(function (error, success) {
    if (error) {
        console.warn('SMTP Connection Warning:', error.message);
        console.warn('Email notifications will not be sent until SMTP connection is restored.');
    } else {
        console.log('SMTP Server is ready to take our messages');
    }
});

const sendOTP = async (email, otp) => {
    const mailOptions = {
        from: '"LabFace Support" <labfaceassistance@gmail.com>',
        to: email,
        subject: 'Password Reset OTP - LabFace',
        text: `Your password reset code is: ${otp}. It expires in 10 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
                    <h1 style="color: #0f172a; margin: 0;">LabFace</h1>
                    <p style="color: #64748b; margin: 5px 0 0;">Smart Attendance System</p>
                </div>
                <div style="padding: 30px 20px; text-align: center;">
                    <h2 style="color: #334155; margin-top: 0;">Password Reset Request</h2>
                    <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                        We received a request to reset your password. Use the verification code below to complete the process.
                    </p>
                    <div style="margin: 30px 0;">
                        <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3b82f6; background-color: #eff6ff; padding: 15px 30px; border-radius: 8px; border: 1px solid #dbeafe;">
                            ${otp}
                        </span>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">
                        This code will expire in <strong>10 minutes</strong>.
                    </p>
                    <p style="color: #64748b; font-size: 14px;">
                        If you didn't request this, you can safely ignore this email.
                    </p>
                </div>
                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #94a3b8; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} LabFace. All rights reserved.</p>
                    <p>Polytechnic University of the Philippines</p>
                </div>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

const sendApprovalEmail = async (email, firstName, lastName) => {
    const mailOptions = {
        from: '"LabFace Support" <labfaceassistance@gmail.com>',
        to: email,
        subject: 'Professor Account Approved - LabFace',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
                    <h1 style="color: #0f172a; margin: 0;">LabFace</h1>
                    <p style="color: #64748b; margin: 5px 0 0;">Smart Attendance System</p>
                </div>
                <div style="padding: 30px 20px;">
                    <h2 style="color: #10b981; margin-top: 0;">✓ Account Approved!</h2>
                    <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                        Dear Professor ${firstName} ${lastName},
                    </p>
                    <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                        Great news! Your professor account has been approved by the Laboratory Head. You can now login and start using LabFace.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://www.labface.site/login" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Login Now
                        </a>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">
                        If you have any questions, please contact the Laboratory Head.
                    </p>
                </div>
                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #94a3b8; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} LabFace. All rights reserved.</p>
                    <p>Polytechnic University of the Philippines</p>
                </div>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

const sendRejectionEmail = async (email, firstName, lastName, reason) => {
    const mailOptions = {
        from: '"LabFace Support" <labfaceassistance@gmail.com>',
        to: email,
        subject: 'Professor Account Registration Update - LabFace',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
                    <h1 style="color: #0f172a; margin: 0;">LabFace</h1>
                    <p style="color: #64748b; margin: 5px 0 0;">Smart Attendance System</p>
                </div>
                <div style="padding: 30px 20px;">
                    <h2 style="color: #ef4444; margin-top: 0;">Registration Update</h2>
                    <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                        Dear Professor ${firstName} ${lastName},
                    </p>
                    <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                        We regret to inform you that your professor account registration was not approved.
                    </p>
                    ${reason ? `
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                        <p style="color: #991b1b; margin: 0; font-weight: bold;">Reason:</p>
                        <p style="color: #7f1d1d; margin: 5px 0 0;">${reason}</p>
                    </div>
                    ` : ''}
                    <p style="color: #64748b; font-size: 14px;">
                        If you believe this is an error or have questions, please contact the Laboratory Head for assistance.
                    </p>
                </div>
                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #94a3b8; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} LabFace. All rights reserved.</p>
                    <p>Polytechnic University of the Philippines</p>
                </div>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

const sendLabHeadNotification = async (professorFirstName, professorLastName, professorEmail, professorId) => {
    const mailOptions = {
        from: '"LabFace System" <labfaceassistance@gmail.com>',
        to: 'labfaceassistance@gmail.com', // Laboratory Head email
        subject: '🔔 New Professor Registration - Action Required',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
                    <h1 style="color: #0f172a; margin: 0;">LabFace</h1>
                    <p style="color: #64748b; margin: 5px 0 0;">Laboratory Head Dashboard</p>
                </div>
                <div style="padding: 30px 20px;">
                    <h2 style="color: #3b82f6; margin-top: 0;">🔔 New Professor Registration</h2>
                    <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                        A new professor has registered and is awaiting your approval.
                    </p>
                    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                        <p style="color: #1e40af; margin: 0; font-weight: bold;">Professor Details:</p>
                        <p style="color: #1e3a8a; margin: 5px 0 0;"><strong>Name:</strong> ${professorFirstName} ${professorLastName}</p>
                        <p style="color: #1e3a8a; margin: 5px 0 0;"><strong>Email:</strong> ${professorEmail}</p>
                        <p style="color: #1e3a8a; margin: 5px 0 0;"><strong>Professor ID:</strong> ${professorId}</p>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://www.labface.site/admin/dashboard" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Review Registration
                        </a>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">
                        Please review the professor's credentials and approve or reject their registration.
                    </p>
                </div>
                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #94a3b8; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} LabFace. All rights reserved.</p>
                    <p>Polytechnic University of the Philippines</p>
                </div>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

async function sendIdentityTheftReport(userId, reporterEmail, reporterName, description, adminEmails) {
    const recipients = adminEmails && adminEmails.length > 0 ? adminEmails : 'labfaceassistance@gmail.com';
    const mailOptions = {
        from: 'labfaceassistance@gmail.com',
        to: recipients, // Send to all admins
        subject: `⚠️ Identity Theft Report - User ID: ${userId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0;">⚠️ New Identity Theft Report</h2>
                </div>
                <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        A new identity theft report has been submitted. Please investigate this matter immediately.
                    </p>
                    
                    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #dc2626;">Report Details</h3>
                        <p style="margin: 5px 0;"><strong>Reported User ID:</strong> ${userId}</p>
                        <p style="margin: 5px 0;"><strong>Reporter Name:</strong> ${reporterName}</p>
                        <p style="margin: 5px 0;"><strong>Reporter Email:</strong> ${reporterEmail}</p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    
                    ${description ? `
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h4 style="margin-top: 0; color: #374151;">Description:</h4>
                        <p style="color: #6b7280; margin: 0;">${description}</p>
                    </div>
                    ` : ''}
                    
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        Please review this report in the admin dashboard and take appropriate action.
                    </p>
                </div>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
}

const sendIdentityTheftUpdateEmail = async (email, firstName, reportId, status, note, outcome) => {
    let subject = '';
    let headerColor = '';
    let statusTitle = '';
    let statusMessage = '';
    let outcomeMessage = '';

    switch (status) {
        case 'investigating':
            subject = 'Update on your Identity Theft Report - LabFace';
            headerColor = '#3b82f6'; // Blue
            statusTitle = 'Investigation Started';
            statusMessage = 'We have received your identity theft report and a security officer is currently reviewing the details. We will notify you of the outcome shortly.';
            break;
        case 'resolved':
            subject = 'Identity Theft Report Resolved - LabFace';
            headerColor = '#10b981'; // Green
            statusTitle = 'Report Resolved';
            statusMessage = 'We have completed our investigation and taken the necessary action regarding your report. The issue has been resolved.';

            // Add outcome information
            if (outcome === 'reported_is_impostor') {
                outcomeMessage = '<div style="background-color: #dcfce7; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">' +
                    '<p style="color: #166534; margin: 0; font-weight: bold;">Investigation Outcome:</p>' +
                    '<p style="color: #15803d; margin: 5px 0 0;">The reported account has been confirmed as fraudulent. Appropriate disciplinary action has been taken.</p>' +
                    '</div>';
            } else if (outcome === 'reporter_is_impostor') {
                outcomeMessage = '<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">' +
                    '<p style="color: #991b1b; margin: 0; font-weight: bold;">Investigation Outcome:</p>' +
                    '<p style="color: #b91c1c; margin: 5px 0 0;">After thorough investigation, your claim has been determined to be unfounded. Filing false reports may result in disciplinary action.</p>' +
                    '</div>';
            }
            break;
        case 'dismissed':
            subject = 'Identity Theft Report Dismissed - LabFace';
            headerColor = '#6b7280'; // Gray
            statusTitle = 'Report Dismissed';
            statusMessage = 'After a thorough investigation, we have determined that no further action is required at this time.';
            break;
        default:
            return;
    }

    const mailOptions = {
        from: '"LabFace Support" <labfaceassistance@gmail.com>',
        to: email,
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
                    <h1 style="color: #0f172a; margin: 0;">LabFace</h1>
                    <p style="color: #64748b; margin: 5px 0 0;">Smart Attendance System</p>
                </div>
                <div style="padding: 30px 20px;">
                    <h2 style="color: ${headerColor}; margin-top: 0;">${statusTitle}</h2>
                    <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                        Dear ${firstName},
                    </p>
                    <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                        ${statusMessage}
                    </p>
                    
                    ${outcomeMessage}
                    
                    ${note ? `
                    <div style="background-color: #f8fafc; border-left: 4px solid ${headerColor}; padding: 15px; margin: 20px 0;">
                        <p style="color: #334155; margin: 0; font-weight: bold;">Admin Note:</p>
                        <p style="color: #475569; margin: 5px 0 0;">${note}</p>
                    </div>
                    ` : ''}
                    
                    <p style="color: #64748b; font-size: 14px;">
                        Report ID: #${reportId}
                    </p>
                    <p style="color: #64748b; font-size: 14px;">
                        If you have any further questions, please contact the Laboratory Head.
                    </p>
                </div>
                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #94a3b8; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} LabFace. All rights reserved.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Identity theft update email sent to ${email}`);
    } catch (error) {
        console.error('Error sending identity theft update email:', error);
    }
};

module.exports = {
    sendOTP,
    sendApprovalEmail,
    sendRejectionEmail,
    sendLabHeadNotification,
    sendIdentityTheftReport,
    sendIdentityTheftUpdateEmail
};
