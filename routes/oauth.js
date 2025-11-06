/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Autodesk Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

const express = require('express');
const { getAuthorizationUrl, authCallbackMiddleware, authRefreshMiddleware, getUserProfile, getTwoLeggedToken, getClientId } = require('./common/aps.js');

const config = require('../config');
const { OAuth } = require('./common/oauthImp');

let router = express.Router();

router.get('/callback/oauth', async (req, res, next) => {
    const { code } = req.query;
    const oauth = new OAuth(req.session);
    try {
        await oauth.setCode(code);
        res.redirect('/');
    } catch(err) {
        next(err);
    }
});

router.get('/oauth/v1/clientid', (req, res) =>{
    res.status(200).end( JSON.stringify({id : getClientId()}) );
});


// router.get('/api/auth/login', function (req, res) {
//     res.end(getAuthorizationUrl());
// });

router.get('/oauth/v1/url', (req, res) => {
    const url =
        'https://developer.api.autodesk.com' +
        '/authentication/v2/authorize?response_type=code' +
        '&client_id=' + config.credentials.client_id +
        '&redirect_uri=' + config.credentials.callback_url +
        '&scope=' + config.scopes.internal.join(' ');
    res.end(url);
});

router.get('/api/auth/logout', function (req, res) {
    req.session = null;
    res.redirect('/');
});

router.get('/oauth/v1/token', async (req, res, next) => {
    const oauth = new OAuth(req.session);
    if (!oauth.isAuthorized()) {
        res.status(401).end();
        return;
    }

    try {
        const publicCredentials = await oauth.getPublicToken();
        publicCredentials? res.json(publicCredentials):res.status(401).end();
        return;
    } catch(err) {
        res.status(401).end();
        return;
    }
});

// router.get('/oauth/v1/token', async (req, res, next) => {
//     try {
//         const credentials = await getTwoLeggedToken();
//         res.json(credentials);
//     } catch(err) {
//         console.error('Error getting 2-legged token:', err);
//         res.status(500).end();
//     }
// });


// router.get('/api/auth/profile', authRefreshMiddleware, async function (req, res, next) {
//     try {
//         const profile = await getUserProfile(req.oAuthToken);
//         res.json({ name: `${profile.name}` });
//     } catch (err) {
//         next(err);
//     }
// });

module.exports = router;
