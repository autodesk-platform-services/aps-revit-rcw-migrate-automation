const { SdkManagerBuilder } = require('@aps_sdk/autodesk-sdkmanager');
const { AuthenticationClient, Scopes, ResponseType } = require('@aps_sdk/authentication');
const { DataManagementClient } = require('@aps_sdk/data-management');

const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL } = require('../../config.js');

const service = module.exports = {};

const sdk = SdkManagerBuilder.create().build();
const authenticationClient = new AuthenticationClient(sdk);
const dataManagementClient = new DataManagementClient(sdk);

service.getClientId = () => { return APS_CLIENT_ID; }

service.getAuthorizationUrl = () => authenticationClient.authorize(APS_CLIENT_ID, ResponseType.Code, APS_CALLBACK_URL, [
    Scopes.DataRead,
    Scopes.AccountRead,
    Scopes.AccountWrite
]);

service.authCallbackMiddleware = async (req, res, next) => {
    const credentials = await authenticationClient.getThreeLeggedToken(APS_CLIENT_ID, req.query.code, APS_CALLBACK_URL,{clientSecret:APS_CLIENT_SECRET});
    req.session.token = credentials.access_token;
    req.session.refresh_token = credentials.refresh_token;
    req.session.expires_at = Date.now() + credentials.expires_in * 1000;
    next();
};

service.authRefreshMiddleware = async (req, res, next) => {
    const { refresh_token, expires_at } = req.session;
    if (!refresh_token) {
        res.status(401).end();
        return;
    }

    if (expires_at < Date.now()) {
        const credentials = await authenticationClient.refreshToken(refresh_token, APS_CLIENT_ID, {
            clientSecret: APS_CLIENT_SECRET,
            scopes: [
                Scopes.DataRead,
                Scopes.AccountRead,
                Scopes.AccountWrite
            ]
        });
        req.session.token = credentials.access_token;
        req.session.refresh_token = credentials.refresh_token;
        req.session.expires_at = Date.now() + credentials.expires_in * 1000;
    }
    req.oAuthToken = {
        access_token: req.session.token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000)
    };
    next();
};

service.getUserProfile = async (token) => {
    const resp = await authenticationClient.getUserInfo(token.access_token);
    return resp;
};

service.getTwoLeggedToken = async () => {
    const credentials = await authenticationClient.getTwoLeggedToken(APS_CLIENT_ID, APS_CLIENT_SECRET, [
        Scopes.DataRead,
        Scopes.DataWrite,
        Scopes.DataCreate,
        Scopes.CodeAll
    ]);
    return {
        access_token: credentials.access_token,
        expires_in: credentials.expires_in
    };
};

// Data Management APIs
service.getHubs = async (token) => {
    const resp = await dataManagementClient.getHubs({ accessToken: token.access_token });
    return resp.data.filter((item)=>{
        return item.id.startsWith('b.');
    })
};

service.getProjects = async (hubId, token) => {
    const resp = await dataManagementClient.getHubProjects(hubId, { accessToken: token.access_token});
    return resp.data.filter( (item)=>{
        return item.attributes.extension.data.projectType == 'ACC';
    } )
};

service.getProject = async (hubId, projectId, token) => { 
    const resp = await dataManagementClient.getProject(hubId, projectId, { accessToken: token.access_token });
    return resp;
};

service.getHubFromProjectId = async (projectId, token) => {
    const hubs = await dataManagementClient.getHubs({ accessToken: token.access_token });
    for (const hub of hubs.data) {
        try {
            const projects = await dataManagementClient.getHubProjects(hub.id, { accessToken: token.access_token });
            const matchingProject = projects.data.find(project => project.id === projectId);
            if (matchingProject) {
                return hub;
            }
        } catch (error) {
            // Continue to next hub if there's an error accessing this hub's projects
            continue;
        }
    }
    return null; // Project not found in any hub
};

service.getFolder = async (projectId, folderId, token) => {
    const resp = await dataManagementClient.getFolder(projectId, folderId, { accessToken: token.access_token });
    return resp;
};

service.getFolderContents = async (projectId, folderId, token) => {
    const resp = await dataManagementClient.getFolderContents(projectId, folderId, { accessToken: token.access_token });
    return resp.data;
};

service.getItem = async (projectId, itemId, token) => {
    const resp = await dataManagementClient.getItem(projectId, itemId, { accessToken: token.access_token });
    return resp;
};

service.getItemVersions = async (projectId, itemId, token) => {
    const resp = await dataManagementClient.getItemVersions(projectId, itemId, { accessToken: token.access_token });
    return resp.data;
};

service.getLatestVersion = async (projectId, itemId, token) => {
    const resp = await dataManagementClient.getItemVersions(projectId, itemId, { accessToken: token.access_token });
    return resp.data[0];
};

service.createFolder = async (projectId, folderData, token) => {
    const resp = await dataManagementClient.createFolder(projectId, folderData, { accessToken: token.access_token });
    return resp;
};

service.createStorage = async (projectId, storageData, token) => {
    const resp = await dataManagementClient.createStorage(projectId, storageData, { accessToken: token.access_token });
    return resp;
};

service.createItem = async (projectId, itemData, token) => {
    const resp = await dataManagementClient.createItem(projectId, itemData, { accessToken: token.access_token });
    return resp;
};

service.createVersion = async (projectId, versionData, token) => {
    const resp = await dataManagementClient.createVersion(projectId, versionData, { accessToken: token.access_token });
    return resp;
};

