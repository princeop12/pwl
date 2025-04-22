const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const levelup = require('levelup');
const leveldown = require('leveldown');
require('dotenv').config();

const app = express();
const port = 3000;

// Initialize LevelDB
const db = levelup(leveldown('PEACECOINWL.db'));

app.use(cors({ origin: 'https://peaceprotocolwaitlist.vercel.app' }));

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
    }
});

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Error: Missing email credentials in .env file');
    process.exit(1);
}

// Utility functions
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateReferralCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

async function sendEmail(to, subject, text) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        text: text
    };

    const maxRetries = 3;
    let attempt = 1;

    while (attempt <= maxRetries) {
        try {
            await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${to} on attempt ${attempt}`);
            return;
        } catch (error) {
            console.error(`Error sending email on attempt ${attempt}:`, error);
            if (attempt === maxRetries) {
                throw new Error(`Failed to send email after ${maxRetries} attempts: ${error.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            attempt++;
        }
    }
}

async function getTotalUsers() {
    let count = 0;
    for await (const [key] of db.iterator({ gt: 'user:', lt: 'user:~' })) {
        count++;
    }
    return count;
}

// API to send verification code
app.post('/api/send-code', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.json({ message: 'Invalid email address' });
    }

    try {
        const userData = await db.get(`user:${email}`).catch(() => null);
        if (userData) {
            const user = JSON.parse(userData);
            if (user) {
                return res.json({ message: 'Email already registered' });
            }
        }

        const code = generateCode();
        await db.put(`verification:${email}`, JSON.stringify({ code, password }));
        console.log(`Stored verification for ${email}:`, { code, password });

        await sendEmail(
            email,
            'PEACE PROTOCOL Wait-List Verification Code',
            `Hello,\n\nThank you for joining the PEACE PROTOCOL Wait-List! Your verification code is:\n\n${code}\n\nPlease enter this code on the website to verify your email.\n\nBest regards,\nThe PEACE PROTOCOL Team`
        );
        res.json({ message: 'Verification code sent to your email.' });
    } catch (error) {
        console.error('Final email sending error:', error);
        res.status(500).json({ message: `Failed to send verification code: ${error.message}` });
    }
});

// API to verify code and handle referrals
app.post('/api/verify-code', async (req, res) => {
    const { email, code, refEmail } = req.body;
    console.log(`Verify request: email=${email}, code=${code}, refEmail=${refEmail}`);

    try {
        const verificationDataRaw = await db.get(`verification:${email}`).catch(() => null);
        let verificationData = null;
        if (verificationDataRaw) {
            verificationData = JSON.parse(verificationDataRaw);
        }
        console.log(`Retrieved verification for ${email}:`, verificationData);

        if (verificationData && String(verificationData.code) === String(code)) {
            const password = verificationData.password;
            if (!password) {
                return res.status(500).json({ message: 'Password not found in verification data' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const position = await getTotalUsers() + 1;
            const referralCode = generateReferralCode();

            await db.put(`user:${email}`, JSON.stringify({ email, password: hashedPassword, position, referralCode, wallet: null }));
            console.log(`User registered: ${email}, position=${position}, referralCode=${referralCode}`);

            if (refEmail && refEmail !== email) {
                console.log(`Processing referral with refEmail=${refEmail}`);
                let referrerEmail = null;

                // Find the referrer by referral code
                for await (const [key, valueRaw] of db.iterator({ gt: 'user:', lt: 'user:~' })) {
                    const user = JSON.parse(valueRaw);
                    if (user.referralCode === refEmail) {
                        referrerEmail = user.email;
                        console.log(`Found referrer: ${referrerEmail} for referral code ${refEmail}`);
                        break;
                    }
                }

                if (referrerEmail) {
                    let referralCountRaw = await db.get(`referrals:${referrerEmail}`).catch(() => null);
                    let referralCount = referralCountRaw ? parseInt(referralCountRaw, 10) : 0;
                    console.log(`Current referral count for ${referrerEmail}: ${referralCount}`);

                    if (isNaN(referralCount)) {
                        console.error(`Invalid referral count for ${referrerEmail}, resetting to 0`);
                        referralCount = 0;
                    }

                    if (referralCount < 20) {
                        referralCount++;
                        await db.put(`referrals:${referrerEmail}`, referralCount.toString());
                        console.log(`Updated referral count for ${referrerEmail} to ${referralCount}`);
                    } else {
                        console.log(`Referral limit (20) reached for ${referrerEmail}`);
                    }
                } else {
                    console.log(`No referrer found for referral code ${refEmail}`);
                }
            } else {
                console.log(`No valid refEmail provided or same as email`);
            }

            await db.del(`verification:${email}`);
            const referralLink = `https://peacecoinwl.loca.lt/?ref=${referralCode}`;
            res.json({ message: 'Email verified successfully', position, referralLink });
        } else {
            res.json({ message: 'Invalid or expired verification code' });
        }
    } catch (error) {
        console.error('Error verifying code:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/submit-wallet', async (req, res) => {
    const { email, solanaWallet, tonWallet } = req.body;
    console.log('Received /api/submit-wallet:', { email, solanaWallet, tonWallet });
    try {
        if (!email) return res.status(400).json({ message: 'Email is required' });

        let userRaw;
        try {
            userRaw = await db.get(`user:${email}`);
        } catch (err) {
            if (err.notFound) return res.status(404).json({ message: 'User not found' });
            throw err;
        }

        let user;
        try {
            user = JSON.parse(userRaw);
        } catch (parseErr) {
            console.error('Error parsing user data:', parseErr);
            return res.status(500).json({ message: 'Corrupted user data' });
        }

        // Optional: Basic wallet format validation
        if (typeof solanaWallet === 'string' && solanaWallet.trim()) {
            if (solanaWallet.length < 42 || solanaWallet.length > 44) {
                console.warn(`Invalid Solana wallet length for ${email}: ${solanaWallet}`);
            }
            user.solanaWallet = solanaWallet.trim();
        }
        if (typeof tonWallet === 'string' && tonWallet.trim()) {
            if (tonWallet.length < 46 || tonWallet.length > 48) {
                console.warn(`Invalid TON wallet length for ${email}: ${tonWallet}`);
            }
            user.tonWallet = tonWallet.trim();
        }

        // Ensure fields exist
        user.solanaWallet = user.solanaWallet || null;
        user.tonWallet = user.tonWallet || null;

        await db.put(`user:${email}`, JSON.stringify(user));
        console.log('Stored user:', { email, solanaWallet: user.solanaWallet, tonWallet: user.tonWallet });

        res.json({ message: 'Wallet addresses submitted successfully' });
    } catch (error) {
        console.error('Error submitting wallets:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/user-data', async (req, res) => {
    try {
        const totalUsers = await getTotalUsers();
        const referrals = {};
        for await (const [key, value] of db.iterator({ gt: 'referrals:', lt: 'referrals:~', keys: true, values: true })) {
            const keyStr = key.toString(); // Convert Buffer to string
            const email = keyStr.split(':')[1];
            referrals[email] = parseInt(value, 10);
        }
        res.json({ totalUsers, referrals });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Received /api/login:', { email });
    try {
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

        let userRaw;
        try {
            userRaw = await db.get(`user:${email}`);
        } catch (err) {
            if (err.notFound) return res.json({ message: 'User not found' });
            throw err;
        }

        const user = JSON.parse(userRaw);
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return res.json({ message: 'Invalid password' });

        const referralLink = `https://peacecoinwl.loca.lt/?ref=${user.referralCode}`;
        const response = {
            success: true,
            message: 'Login successful',
            position: user.position,
            solanaWallet: user.solanaWallet,
            tonWallet: user.tonWallet,
            referralLink
        };
        console.log('Login response:', response);
        res.json(response);
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/send-reset-code', async (req, res) => {
    const { email } = req.body;
    try {
        const userRaw = await db.get(`user:${email}`).catch(() => null);
        if (!userRaw) return res.json({ message: 'User not found' });
        const code = generateCode();
        await db.put(`reset:${email}`, code);
        console.log(`Stored reset code for ${email}:`, code);
        await sendEmail(
            email,
            'PEACE PROTOCOL Password Reset Code',
            `Hello,\n\nYou requested to reset your password for the PEACE PROTOCOL Wait-List. Your reset code is:\n\n${code}\n\nPlease enter this code on the website to reset your password.\n\nBest regards,\nThe PEACE PROTOCOL team.`
        ); 
        res.status(500).json({ message: `Failed to send reset code: ${error.message}` });
    } catch (error) {
        console.error('Final email sending error:', error);
        res.status(500).json({ message: `Failed to send reset code: ${error.message}` });
    }
});


app.post('/api/verify-reset-code', async (req, res) => {
    const { email, code } = req.body;
    try {
        const storedCode = await db.get(`reset:${email}`).catch(() => null);
        console.log(`Retrieved reset code for ${email}:`, storedCode);
        if (storedCode && String(storedCode) === String(code)) {
            res.json({ success: true, message: 'Reset code verified' });
        } else {
            res.json({ message: 'Invalid or expired reset code' });
        }
    } catch (error) {
        console.error('Error verifying reset code:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const userRaw = await db.get(`user:${email}`).catch(() => null);
        if (!userRaw) return res.json({ message: 'User not found' });
        const user = JSON.parse(userRaw);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await db.put(`user:${email}`, JSON.stringify(user));
        await db.del(`reset:${email}`);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port} (to be deployed publicly)`);
});
