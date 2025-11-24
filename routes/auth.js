const express = require('express');
const { getAuthorizationUrl, authCallbackMiddleware, authRefreshMiddleware, getUserProfile, getClientId } = require('./common/aps.js');

let router = express.Router();


router.get('/api/auth/login', function (req, res) {
    res.redirect(getAuthorizationUrl());
});

router.get('/api/auth/logout', function (req, res) {
    req.session = null;
    res.redirect('/');
});

router.get('/api/auth/callback', authCallbackMiddleware, function (req, res) {
    res.redirect('/');
});


router.get('/api/auth/profile', authRefreshMiddleware, async function (req, res, next) {
    try {
        const profile = await getUserProfile(req.oAuth3LeggedToken.access_token);
        res.json({ name: `${profile.name}`, picture: `${profile.picture}` });
    } catch (err) {
        next(err);
    }
});

router.get('/oauth/v1/clientid', (req, res) =>{
    res.status(200).end( JSON.stringify({id : getClientId()}) );
});


module.exports = router;
