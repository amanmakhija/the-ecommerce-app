const express = require('express');
const user = require('../models/userModel');
const responseFunction = require('../utils/responseFunction');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const authTokenHandler = require('../middleware/checkAuthToken');

const saltRounds = process.env.SALT_ROUNDS;
const name = process.env.APP_NAME;
const mins = process.env.OTP_EXPIRY_TIME;
const senderEmail = process.env.SENDER_EMAIL_ID;
const senderPass = process.env.SENDER_PASSWORD;

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: senderEmail,
        pass: senderPass
    }
});

const router = express.Router();

router.get('/', (req, res) => {
    res.status(200).json({ message: 'Hello from auth routes' });
});

router.post('/register', async (req, res, next) => {
    try {
        const isUser = await user.findOne({ $or: [{ email: req.body.email }, { mobile: req.body.mobile }, { username: req.body.username }] });
        if (isUser) return responseFunction(res, 400, 'User already exists', null, false);
        const newUser = new user(req.body);
        const result = await newUser.save();
        result.password = undefined;
        return responseFunction(res, 200, 'User registered successfully', result, true);
    } catch (error) {
        return responseFunction(res, 400, 'Error registering user', error.message, false);
    }
});

router.post('/login', async (req, res, next) => {
    const { email, username, password } = req.body;
    try {
        const result = await user.findOne(email ? { email } : { username });
        if (result) {
            if (result.isBlocked) return responseFunction(res, 400, 'User is blocked. Please contact customer care', null, false);
            if (result.status === 'inactive') return responseFunction(res, 400, 'User is inactive. Please verify your email or phone number', null, false);
            const isMatch = await bcrypt.compare(password, result.password);
            if (isMatch) {
                result.password = undefined;
                const authToken = jwt.sign({ id: result._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
                const refreshToken = jwt.sign({ id: result._id }, process.env.JWT_REFRESH_SECRET_KEY, { expiresIn: '10d' });
                res.cookie('authToken', authToken, { httpOnly: true, secure: false, sameSite: 'none' });
                res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'none' });
                return responseFunction(res, 200, 'User logged in successfully', result, true);
            } else {
                return responseFunction(res, 400, 'Invalid credentials', null, false);
            }
        } else {
            return responseFunction(res, 400, 'User not found', null, false);
        }
    } catch (error) {
        return responseFunction(res, 400, 'Error logging in', error.message, false);
    }
});

router.post('/send-otp', async (req, res, next) => {
    const { email, mobile } = req.body;
    if (!mobile) {
        if (!email) return responseFunction(res, 400, 'Email is required', null, false);
        return responseFunction(res, 400, 'Mobile is required', null, false);
    }
    try {
        const result = await user.findOne(email ? { email } : { mobile });
        if (email && result.isEmailVerified) return responseFunction(res, 400, 'Your email is already verified', null, false);
        if (mobile && result.isMobileVerified) return responseFunction(res, 400, 'Your mobile is already verified', null, false);
        if (!result) return responseFunction(res, 400, 'User not found', null, false);
        const otp = Math.floor(100000 + Math.random() * 900000);
        const hashedOtp = bcrypt.hash("" + otp, saltRounds);
        // Otp expire after 5 minutes
        const expireAt = Date.now() + mins * 60 * 1000;
        result.otp = hashedOtp;
        result.optExpireAt = expireAt;
        await result.save();
        transporter.sendMail({
            from: senderEmail,
            to: email,
            subject: `${name} Account Activation OTP`,
            text: `Use ${otp} as your OTP to activate your account. Never share your OTP with any unauthorized person. OTP is confidential and valid for ${mins} mins only.\n\nBest,\nTeam ${name}`
        }, (error, info) => {
            if (error) return responseFunction(res, 400, 'Error while sending OTP', null, false);
            else return responseFunction(res, 200, 'OTP sent successfully', null, true);
        });
    } catch (error) {
        return responseFunction(res, 400, 'Error sending OTP', error.message, false);
    }
});

router.post('/verify-otp', async (req, res, next) => {
    const { email, mobile, otp } = req.body;
    if (!email) {
        if (!mobile) return responseFunction(res, 400, 'Mobile is required', null, false);
        return responseFunction(res, 400, 'Email is required', null, false);
    }
    if (!otp) return responseFunction(res, 400, 'OTP is required', null, false);
    try {
        const result = await user.findOne(email ? { email } : { mobile });
        if (result) {
            if (result.optExpireAt < Date.now()) {
                result.otp = null;
                result.optExpireAt = null;
                await result.save();
                return responseFunction(res, 400, 'OTP has expired', null, false);
            }
            const matched = bcrypt.compare(result.otp, otp);
            if (!matched) return responseFunction(res, 400, 'Invalid OTP', null, false);
            result.otp = null;
            result.optExpireAt = null;
            result.status = 'active';
            if (email) result.isEmailVerified = true;
            if (mobile) result.isMobileVerified = true;
            await result.save();
            return responseFunction(res, 200, 'OTP verified successfully', null, true);
        } else {
            return responseFunction(res, 400, 'User not found', null, false);
        }
    } catch (error) {
        return responseFunction(res, 400, 'Error verifying OTP', error.message, false);
    }
});

router.post('/upload-profile-pic', async (req, res, next) => {
    const { username, profilePicUrl } = req.body;
    if (!username) return responseFunction(res, 400, 'Username is required', null, false);
    if (!profilePicUrl) return responseFunction(res, 400, 'Profile picture is required', null, false);
    try {
        const result = await user.findOne({ username });
        if (result) {
            result.profilePic = profilePicUrl;
            await result.save();
            return responseFunction(res, 200, 'Profile picture uploaded successfully', null, true);
        } else {
            return responseFunction(res, 400, 'User not found', null, false);
        }
    } catch (error) {
        return responseFunction(res, 400, 'Error uploading profile picture', error.message, false);
    }
});

router.post('/forgot-password', async (req, res, next) => {
    const { email, mobile } = req.body;
    if (!mobile) {
        if (!email) return responseFunction(res, 400, 'Email is required', null, false);
        return responseFunction(res, 400, 'Mobile is required', null, false);
    }
    try {
        const result = await user.findOne(email ? { email } : { mobile });
        if (result) {
            const otp = Math.floor(100000 + Math.random() * 900000);
            const hashedOtp = bcrypt.hash("" + otp, saltRounds);
            // Otp expire after 5 minutes
            const expireAt = Date.now() + mins * 60 * 1000;
            result.forgetPasswordOTP = hashedOtp;
            result.forgetPasswordOTPExpireAt = expireAt;
            await result.save();
            const forgetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password?user=${result.username}?o=${hashedOtp}`;
            transporter.sendMail({
                from: senderEmail,
                to: email,
                subject: `${name} Password Reset URL`,
                text: `Please click the below link to change your password.\n\n${forgetPasswordUrl}\n\nDo not share this link with any unauthorised person. Link is confidential and valid for ${mins} mins only.\n\nBest,\nTeam ${name}`
            }, (error, info) => {
                if (error) return responseFunction(res, 400, 'Error while sending mail', null, false);
                else return responseFunction(res, 200, 'Mail sent successfully', null, true);
            });
        } else {
            return responseFunction(res, 400, 'User not found', null, false);
        }
    } catch (error) {
        return responseFunction(res, 400, 'Error sending OTP', error.message, false);
    }
});

router.post('/reset-password', async (req, res, next) => {
    const { username, otp, password } = req.body;
    if (!username) return responseFunction(res, 400, 'Username is required', null, false);
    if (!otp) return responseFunction(res, 400, 'OTP is required', null, false);
    if (!password) return responseFunction(res, 400, 'Password is required', null, false);
    try {
        const result = await user.findOne({ username });
        if (result) {
            if (result.forgetPasswordOTPExpireAt < Date.now()) {
                result.forgetPasswordOTP = null;
                result.forgetPasswordOTPExpireAt = null;
                await result.save();
                return responseFunction(res, 400, 'Link has expired', null, false);
            }
            const matched = bcrypt.compare(result.forgetPasswordOTP, otp);
            if (!matched) return responseFunction(res, 400, 'Link not valid', null, false);
            result.forgetPasswordOTP = null;
            result.forgetPasswordOTPExpireAt = null;
            result.password = password;
            await result.save();
            return responseFunction(res, 200, 'Password reset successfully', null, true);
        } else {
            return responseFunction(res, 400, 'User not found', null, false);
        }
    } catch (error) {
        return responseFunction(res, 400, 'Error resetting password', error.message, false);
    }
});

router.post('/check-login', authTokenHandler, async (req, res, next) => {
    return responseFunction(res, 200, req.message, { userId: req.userId }, req.ok);
})

module.exports = router;