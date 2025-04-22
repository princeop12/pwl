let currentUserEmail = '';
let userPosition = 0;

// Simulated data (to be replaced with database later)
let currentUsers = 0; // Total wait-listed users
let currentReferrals = 0; // Number of referrals for the current user
const maxUsers = 20000;
const maxReferrals = 20;

// Gradient animation offset for glittering effect
let gradientOffset = 0;

// Canvas setup for progress bar
const canvas = document.getElementById('progressCanvas');
const ctx = canvas.getContext('2d');

// Dynamically set canvas size based on the peace-symbol element
const peaceSymbol = document.querySelector('.peace-symbol');
const resizeCanvas = () => {
    const size = peaceSymbol.offsetWidth;
    canvas.width = size;
    canvas.height = size;
};
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Function to format numbers (e.g., 12500 to 12.5K)
function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Function to draw the progress ring with glittering effect
function drawProgress() {
    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const ringRadius = (size / 2) - 12; // Adjusted for no outlines, slightly inset
    const ringThickness = 24; // Increased thickness

    ctx.clearRect(0, 0, size, size);

    // Cap the progress at max values
    const cappedUsers = Math.min(currentUsers, maxUsers);
    const cappedReferrals = Math.min(currentReferrals, maxReferrals);

    // Calculate progress percentages (capped at max)
    const userProgress = cappedUsers / maxUsers;
    const referralProgress = cappedReferrals / maxReferrals;

    // Update gradient offset for glittering effect
    gradientOffset = (gradientOffset + 0.02) % 1;

    // Create a shadow for the glittering effect
    ctx.shadowColor = '#A855F7';
    ctx.shadowBlur = 10;

    // Draw user progress (left half, from top to 125 degrees counterclockwise)
    const userAngle = (Math.PI * (125 / 180)) * userProgress; // 125 degrees for full progress
    const userGradient = ctx.createLinearGradient(0, 0, size, size);
    userGradient.addColorStop((0 + gradientOffset) % 1, '#A855F7');
    userGradient.addColorStop((0.5 + gradientOffset) % 1, '#6A0DAD');
    userGradient.addColorStop((1 + gradientOffset) % 1, '#A855F7');
    ctx.beginPath();
    ctx.lineWidth = ringThickness;
    ctx.strokeStyle = userGradient;
    ctx.arc(centerX, centerY, ringRadius, -Math.PI / 2, -Math.PI / 2 - userAngle, true); // Start at top, counterclockwise to 125 degrees
    ctx.stroke();

    // Draw referral progress (right half, from top to 125 degrees clockwise)
    const referralAngle = (Math.PI * (125 / 180)) * referralProgress; // 125 degrees for full progress
    const referralGradient = ctx.createLinearGradient(size, 0, 0, size);
    referralGradient.addColorStop((0 + gradientOffset) % 1, '#A855F7');
    referralGradient.addColorStop((0.5 + gradientOffset) % 1, '#6A0DAD');
    referralGradient.addColorStop((1 + gradientOffset) % 1, '#A855F7');
    ctx.beginPath();
    ctx.lineWidth = ringThickness;
    ctx.strokeStyle = referralGradient;
    ctx.arc(centerX, centerY, ringRadius, -Math.PI / 2, -Math.PI / 2 + referralAngle, false); // Start at top, clockwise to 125 degrees
    ctx.stroke();

    // Reset shadow to avoid affecting other elements
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Update text
    document.getElementById('userPosition').textContent = formatNumber(Math.round(userPosition));

    // Check if user progress is complete and update "20K MAX" text
    if (cappedUsers >= maxUsers) {
        document.getElementById('maxUsers').classList.add('completed');
    }

    // Check if referral progress is complete and update "20 MAX" text
    if (cappedReferrals >= maxReferrals) {
        document.getElementById('maxRefs').classList.add('completed');
    }

    // Update dual milestone checkmarks
    // Users milestones
    document.getElementById('users1kCheckmark').style.opacity = cappedUsers >= 1000 ? '1' : '0';
    document.getElementById('users3kCheckmark').style.opacity = cappedUsers >= 3000 ? '1' : '0';
    document.getElementById('users5kCheckmark').style.opacity = cappedUsers >= 5000 ? '1' : '0';
    document.getElementById('users10kCheckmark').style.opacity = cappedUsers >= 10000 ? '1' : '0';
    document.getElementById('users20kCheckmark').style.opacity = cappedUsers >= 20000 ? '1' : '0';

    // Referrals milestones
    document.getElementById('invites1Checkmark').style.opacity = cappedReferrals >= 1 ? '1' : '0';
    document.getElementById('invites3Checkmark').style.opacity = cappedReferrals >= 3 ? '1' : '0';
    document.getElementById('invites5Checkmark').style.opacity = cappedReferrals >= 5 ? '1' : '0';
    document.getElementById('invites10Checkmark').style.opacity = cappedReferrals >= 10 ? '1' : '0';
    document.getElementById('invites20Checkmark').style.opacity = cappedReferrals >= 20 ? '1' : '0';
}

// Function to update total users and referrals, and redraw progress
function updateTotalUsers() {
    fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentEmail: currentUserEmail })
    })
        .then(response => response.json())
        .then(data => {
            console.log('User Data:', data);
            currentUsers = data.totalUsers || 0;
            currentReferrals = data.referrals[currentUserEmail] || 0; // Fetch referrals for this user
            document.getElementById('totalUsers').textContent = currentUsers;
            drawProgress();
        })
        .catch(error => console.error('Error fetching user data:', error));
}

// Form Toggling Functions
function showRegisterForm() {
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('resetPasswordForm').style.display = 'none';
    clearMessages();
}

function showLoginForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('resetPasswordForm').style.display = 'none';
    clearMessages();
}

function showForgotPasswordForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'block';
    document.getElementById('resetPasswordForm').style.display = 'none';
    clearMessages();
}

function showResetPasswordForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('resetPasswordForm').style.display = 'block';
    clearMessages();
}

// Function to clear all messages
function clearMessages() {
    document.getElementById('message').textContent = '';
    document.getElementById('position').textContent = '';
    document.getElementById('loginMessage').textContent = '';
    document.getElementById('resetMessage').textContent = '';
    document.getElementById('resetPasswordMessage').textContent = '';
}

// Function to get referral code from URL
function getRefFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
}

// Function to populate referral code field
function populateReferralCode() {
    const refCode = getRefFromUrl();
    const referralInput = document.getElementById('referralInput');
    if (refCode && referralInput) {
        referralInput.value = refCode;
        console.log(`Auto-filled referral code: ${refCode}`);
    }
}

// Check for referral link and initialize on page load
window.onload = function() {
    const refCode = getRefFromUrl();
    if (refCode) {
        showRegisterForm();
        populateReferralCode();
    } else {
        showLoginForm();
    }
    updateTotalUsers();

    // Add event listeners for password input to update requirements
    const passwordInput = document.getElementById('passwordInput');
    const newPasswordInput = document.getElementById('newPasswordInput');
    if (passwordInput) {
        passwordInput.addEventListener('input', updatePasswordRequirements);
    }
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', updateNewPasswordRequirements);
    }
};

// Password validation function
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
        return 'Password must be at least 8 characters long';
    }
    if (!hasUpperCase) {
        return 'Password must contain at least 1 uppercase letter';
    }
    if (!hasLowerCase) {
        return 'Password must contain at least 1 lowercase letter';
    }
    if (!hasNumber) {
        return 'Password must contain at least 1 number';
    }
    if (!hasSymbol) {
        return 'Password must contain at least 1 symbol';
    }
    return null; // Password is valid
}

// Function to update password requirements indicator (Registration Form)
function updatePasswordRequirements() {
    const password = document.getElementById('passwordInput').value;

    const reqLength = document.getElementById('req-length');
    const reqUppercase = document.getElementById('req-uppercase');
    const reqLowercase = document.getElementById('req-lowercase');
    const reqNumber = document.getElementById('req-number');
    const reqSymbol = document.getElementById('req-symbol');

    // Check each requirement
    reqLength.innerHTML = `At least 8 characters: ${password.length >= 8 ? '<span class="valid">✔</span>' : '<span class="invalid">✘</span>'}`;
    reqUppercase.innerHTML = `1 uppercase letter: ${/[A-Z]/.test(password) ? '<span class="valid">✔</span>' : '<span class="invalid">✘</span>'}`;
    reqLowercase.innerHTML = `1 lowercase letter: ${/[a-z]/.test(password) ? '<span class="valid">✔</span>' : '<span class="invalid">✘</span>'}`;
    reqNumber.innerHTML = `1 number: ${/[0-9]/.test(password) ? '<span class="valid">✔</span>' : '<span class="invalid">✘</span>'}`;
    reqSymbol.innerHTML = `1 symbol: ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '<span class="valid">✔</span>' : '<span class="invalid">✘</span>'}`;
}

// Function to update password requirements indicator (Reset Password Form)
function updateNewPasswordRequirements() {
    const password = document.getElementById('newPasswordInput').value;

    const reqLength = document.getElementById('new-req-length');
    const reqUppercase = document.getElementById('new-req-uppercase');
    const reqLowercase = document.getElementById('new-req-lowercase');
    const reqNumber = document.getElementById('new-req-number');
    const reqSymbol = document.getElementById('new-req-symbol');

    // Check each requirement
    reqLength.innerHTML = `At least 8 characters: ${password.length >= 8 ? '<span class="valid">✔</span>' : '<span class="invalid">✘</span>'}`;
    reqUppercase.innerHTML = `1 uppercase letter: ${/[A-Z]/.test(password) ? '<span class="valid">✔</span>' : '<span class="invalid">✘</span>'}`;
    reqLowercase.innerHTML = `1 lowercase letter: ${/[a-z]/.test(password) ? '<span class="valid">✔</span>' : '<span class="invalid">✘</span>'}`;
    reqNumber.innerHTML = `1 number: ${/[0-9]/.test(password) ? '<span class="valid">✔</span>' : '<span class="invalid">✘</span>'}`;
    reqSymbol.innerHTML = `1 symbol: ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '<span class="valid">✔</span>' : '<span class="invalid">✘</span>'}`;
}

// Function to toggle password visibility
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = '👁️'; // Eye open
    } else {
        input.type = 'password';
        icon.textContent = '👁️'; // Eye closed
    }
}

// Registration: Send Verification Code
function sendCode() {
    const emailInput = document.getElementById('emailInput').value;
    const passwordInput = document.getElementById('passwordInput').value;
    const confirmPasswordInput = document.getElementById('confirmPasswordInput').value;
    const messageDiv = document.getElementById('message');

    // Validate inputs
    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
        messageDiv.style.color = 'red';
        messageDiv.textContent = 'Invalid email address';
        return;
    }

    const passwordError = validatePassword(passwordInput);
    if (passwordError) {
        messageDiv.style.color = 'red';
        messageDiv.textContent = passwordError;
        return;
    }

    if (passwordInput !== confirmPasswordInput) {
        messageDiv.style.color = 'red';
        messageDiv.textContent = 'Passwords do not match';
        return;
    }

    fetch('/api/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
    })
        .then(response => response.json())
        .then(data => {
            messageDiv.style.color = data.message.includes('Invalid') ? 'red' : '#A855F7';
            messageDiv.textContent = data.message;
            if (!data.message.includes('Invalid')) {
                currentUserEmail = emailInput;
            }
            updateTotalUsers();
        })
        .catch(error => console.error('Error sending code:', error));
}

// ... (previous code unchanged)

function verifyCode() {
    const emailInput = document.getElementById('emailInput').value;
    const solanaWalletInput = document.getElementById('solanaWalletInput').value;
    const tonWalletInput = document.getElementById('tonWalletInput').value;
    const codeInput = document.getElementById('codeInput').value;
    const referralInput = document.getElementById('referralInput').value.trim();
    const messageDiv = document.getElementById('message');
    const positionDiv = document.getElementById('position');

    // Validate wallets
    if (solanaWalletInput && solanaWalletInput.length < 42) {
        messageDiv.style.color = 'red';
        messageDiv.textContent = 'Solana wallet address seems too short';
        return;
    }
    if (tonWalletInput && tonWalletInput.length < 46) {
        messageDiv.style.color = 'red';
        messageDiv.textContent = 'TON wallet address seems too short';
        return;
    }

    const requestData = { email: emailInput, code: codeInput };
    if (referralInput) {
        requestData.refEmail = referralInput;
    } else {
        const refFromUrl = getRefFromUrl();
        if (refFromUrl) {
            requestData.refEmail = refFromUrl;
        }
    }

    fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    })
        .then(response => response.json())
        .then(data => {
            messageDiv.style.color = data.message.includes('Invalid') || data.message.includes('not found') ? 'red' : 'green';
            messageDiv.textContent = data.message;
            if (data.position) {
                userPosition = data.position;
                positionDiv.textContent = `Your Position: ${userPosition}`;
                const walletData = { email: emailInput };
                if (solanaWalletInput.trim()) walletData.solanaWallet = solanaWalletInput.trim();
                if (tonWalletInput.trim()) walletData.tonWallet = tonWalletInput.trim();
                console.log('Sending to /api/submit-wallet:', walletData);
                fetch('/api/submit-wallet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(walletData)
                })
                    .then(response => response.json())
                    .then(walletData => {
                        console.log('Submit wallet response:', walletData);
                        const referralLink = data.referralLink;
                        window.location.href = `success.html?email=${encodeURIComponent(emailInput)}&solanaWallet=${encodeURIComponent(solanaWalletInput || '')}&tonWallet=${encodeURIComponent(tonWalletInput || '')}&referralLink=${encodeURIComponent(referralLink)}&position=${userPosition}`;
                    })
                    .catch(error => console.error('Error submitting wallets:', error));
            }
            updateTotalUsers();
        })
        .catch(error => console.error('Error verifying code:', error));
}

function login() {
    const emailInput = document.getElementById('loginEmailInput').value;
    const passwordInput = document.getElementById('loginPasswordInput').value;
    const messageDiv = document.getElementById('loginMessage');

    if (!emailInput || !passwordInput) {
        messageDiv.style.color = 'red';
        messageDiv.textContent = 'Please enter both email and password';
        return;
    }

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
    })
        .then(response => response.json())
        .then(data => {
            console.log('Login response:', data);
            messageDiv.style.color = data.message.includes('Invalid') ? 'red' : 'green';
            messageDiv.textContent = data.message;
            if (data.success) {
                currentUserEmail = emailInput;
                userPosition = data.position;
                const referralLink = data.referralLink;
                const solanaWallet = data.solanaWallet ?? '';
                const tonWallet = data.tonWallet ?? '';
                window.location.href = `success.html?email=${encodeURIComponent(emailInput)}&wallet=${encodeURIComponent(solanaWallet)}&tonWallet=${encodeURIComponent(tonWallet)}&referralLink=${encodeURIComponent(referralLink)}&position=${userPosition}`;
            }
        })
        .catch(error => console.error('Error logging in:', error));
}


// Login Function
function login() {
    const emailInput = document.getElementById('loginEmailInput').value;
    const passwordInput = document.getElementById('loginPasswordInput').value;
    const messageDiv = document.getElementById('loginMessage');

    if (!emailInput || !passwordInput) {
        messageDiv.style.color = 'red';
        messageDiv.textContent = 'Please enter both email and password';
        return;
    }

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
    })
        .then(response => response.json())
        .then(data => {
            messageDiv.style.color = data.message.includes('Invalid') ? 'red' : 'green';
            messageDiv.textContent = data.message;
            if (data.success) {
                currentUserEmail = emailInput;
                userPosition = data.position;
                const referralLink = data.referralLink;
                const solanaWallet = data.solanaWallet || 'Not provided';
                const tonWallet = data.tonWallet || 'Not provided';
                window.location.href = `success.html?email=${encodeURIComponent(emailInput)}&solanaWallet=${encodeURIComponent(solanaWallet)}&tonWallet=${encodeURIComponent(tonWallet)}&referralLink=${encodeURIComponent(referralLink)}&position=${userPosition}`;
            }
        })
        .catch(error => console.error('Error logging in:', error));
}

// Forgot Password: Send Reset Code
function sendResetCode() {
    const emailInput = document.getElementById('forgotEmailInput').value;
    const messageDiv = document.getElementById('resetMessage');

    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
        messageDiv.style.color = 'red';
        messageDiv.textContent = 'Invalid email address';
        return;
    }

    fetch('/api/send-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput })
    })
        .then(response => response.json())
        .then(data => {
            messageDiv.style.color = data.message.includes('not found') ? 'red' : '#A855F7';
            messageDiv.textContent = data.message;
            if (data.message.includes('sent')) {
                currentUserEmail = emailInput;
            }
        })
        .catch(error => console.error('Error sending reset code:', error));
}

// Forgot Password: Verify Reset Code
function verifyResetCode() {
    const emailInput = document.getElementById('forgotEmailInput').value;
    const codeInput = document.getElementById('resetCodeInput').value;
    const messageDiv = document.getElementById('resetMessage');

    fetch('/api/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, code: codeInput })
    })
        .then(response => response.json())
        .then(data => {
            messageDiv.style.color = data.message.includes('Invalid') ? 'red' : 'green';
            messageDiv.textContent = data.message;
            if (data.success) {
                showResetPasswordForm();
            }
        })
        .catch(error => console.error('Error verifying reset code:', error));
}

// Forgot Password: Reset Password
function resetPassword() {
    const emailInput = document.getElementById('forgotEmailInput').value;
    const newPasswordInput = document.getElementById('newPasswordInput').value;
    const confirmNewPasswordInput = document.getElementById('confirmNewPasswordInput').value;
    const messageDiv = document.getElementById('resetPasswordMessage');

    const passwordError = validatePassword(newPasswordInput);
    if (passwordError) {
        messageDiv.style.color = 'red';
        messageDiv.textContent = passwordError;
        return;
    }

    if (newPasswordInput !== confirmNewPasswordInput) {
        messageDiv.style.color = 'red';
        messageDiv.textContent = 'Passwords do not match';
        return;
    }

    fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, newPassword: newPasswordInput })
    })
        .then(response => response.json())
        .then(data => {
            messageDiv.style.color = data.message.includes('successfully') ? 'green' : 'red';
            messageDiv.textContent = data.message;
            if (data.success) {
                setTimeout(() => {
                    showLoginForm();
                }, 2000); // Redirect to login form after 2 seconds
            }
        })
        .catch(error => console.error('Error resetting password:', error));
}

// Parallax effect for background
window.addEventListener('scroll', function() {
    const background = document.querySelector('.background');
    const scrollPosition = window.scrollY;
    background.style.transform = `translateY(${scrollPosition * 0.2}px)`;
});

// Continuous redraw for glittering effect
function animateGlitter() {
    drawProgress();
    requestAnimationFrame(animateGlitter);
}

// Animate text
const textSpans = document.querySelectorAll('#animatedText span');
function animateText() {
    setTimeout(() => {
        textSpans.forEach((span, index) => {
            setTimeout(() => {
                span.classList.add('transition-in');
            }, index * 70);
        });
    }, 3000);

    setTimeout(() => {
        textSpans.forEach((span, index) => {
            setTimeout(() => {
                span.classList.remove('transition-in');
            }, index * 70);
        });
    }, 8000);

    setTimeout(animateText, 11000);
}

// Start the animation
animateText();
animateGlitter();