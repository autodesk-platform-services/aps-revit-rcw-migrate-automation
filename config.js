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


require('dotenv').config();

let { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, APS_WEBHOOK_URL, SERVER_SESSION_SECRET, PORT } = process.env;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET || !APS_CALLBACK_URL || !APS_WEBHOOK_URL || !SERVER_SESSION_SECRET) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}
PORT = PORT || 3000;

module.exports = {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_CALLBACK_URL,
    APS_WEBHOOK_URL,
    SERVER_SESSION_SECRET,
    PORT,
    scopes: {
        // Required scopes for the server-side application
        internal: ['code:all', 'bucket:create', 'bucket:read', 'data:read', 'data:create', 'data:write'],

        // Required scopes for the server-side design automation api
        internal_2legged: ['code:all', 'bucket:create', 'bucket:read', 'data:read', 'data:create', 'data:write'],

        // Required scope for the client-side viewer
        public: ['viewables:read']
    },
    designAutomation:{
        endpoint: 'https://developer.api.autodesk.com/da/us-east/v3/',
        webhook_url: APS_WEBHOOK_URL,
        nickname:     process.env.DESIGN_AUTOMATION_NICKNAME?process.env.DESIGN_AUTOMATION_NICKNAME:process.env.APS_CLIENT_ID,
        activity_name: process.env.DESIGN_AUTOMATION_ACTIVITY_NAME?process.env.DESIGN_AUTOMATION_ACTIVITY_NAME:"RCWMigratorAppActivity",
        appbundle_activity_alias: process.env.DESIGN_AUTOMATION_ACTIVITY_ALIAS?process.env.DESIGN_AUTOMATION_ACTIVITY_ALIAS:'dev',

        URL:{
            GET_ENGINES_URL:    "https://developer.api.autodesk.com/da/us-east/v3/engines",
            ACTIVITIES_URL:     "https://developer.api.autodesk.com/da/us-east/v3/activities",
            ACTIVITY_URL:       "https://developer.api.autodesk.com/da/us-east/v3/activities/{0}",
            APPBUNDLES_URL:     "https://developer.api.autodesk.com/da/us-east/v3/appbundles",
            APPBUNDLE_URL:      "https://developer.api.autodesk.com/da/us-east/v3/appbundles/{0}",

            CREATE_APPBUNDLE_VERSION_URL: "https://developer.api.autodesk.com/da/us-east/v3/appbundles/{0}/versions",
            CREATE_APPBUNDLE_ALIAS_URL:   "https://developer.api.autodesk.com/da/us-east/v3/appbundles/{0}/aliases",

            UPDATE_APPBUNDLE_ALIAS_URL:  "https://developer.api.autodesk.com/da/us-east/v3/appbundles/{0}/aliases/{1}",
            CREATE_ACTIVITY_ALIAS: "https://developer.api.autodesk.com/da/us-east/v3/activities/{0}/aliases",
        }
    }


};
