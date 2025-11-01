import nodemailer from "nodemailer";
import dotenv from "dotenv";

export const verifyEmail = async (token, email) =>{
    const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    }); 

    const mailConfiguration = {
        from: process.env.EMAIL_USER,
        to: email,

        subject: 'Verify your email address',
        html: `<h2>Please click on the link to verify your email</h2>
        <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}">Verify Email</a>`,
    };

    transporter.sendMail(mailConfiguration, function(error, info){
        if (error) {
            console.log('Error occurred while sending email:', error);
        } else {
            console.log('Email sent successfully:', info.response);
        }
    });
}