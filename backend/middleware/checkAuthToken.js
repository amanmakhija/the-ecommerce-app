const jwt = require('jsonwebtoken');

const checkAuthToken = (req, res, next) => {
    const token = req.cookies.authToken;
    const refreshToken = req.cookies.refreshToken;
    if (!token || !refreshToken) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                console.log(err);
                jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY, (refreshErr, refreshDecoded) => {
                    if (refreshErr) {
                        console.log(refreshErr);
                        return res.status(401).json({ message: 'Unauthorized' });
                    }
                    const newToken = jwt.sign({ id: refreshDecoded.userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
                    const newRefreshToken = jwt.sign({ id: refreshDecoded.userId }, process.env.JWT_REFRESH_SECRET_KEY, { expiresIn: '7d' });
                    res.cookie('authToken', newToken, { httpOnly: true, secure: true, sameSite: 'none' });
                    res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'none' });
                    req.userId = refreshDecoded.id;
                    req.ok = true;
                    req.message = 'Authenticated successfully';
                    next();
                });
            }
            req.userId = decoded.id;
            req.ok = true;
            req.message = 'Authenticated successfully';
            next();
        });
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports = checkAuthToken;