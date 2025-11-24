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
    Scopes.DataWrite,
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
                Scopes.DataWrite,
                Scopes.AccountRead,
                Scopes.AccountWrite
            ]
        });
        req.session.token = credentials.access_token;
        req.session.refresh_token = credentials.refresh_token;
        req.session.expires_at = Date.now() + credentials.expires_in * 1000;
    }
    req.oAuth3LeggedToken = {
        access_token: req.session.token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000)
    };
    next();
};


service.auth2LeggedMiddleware = async (req, res, next) => {
    const credentials = await authenticationClient.getTwoLeggedToken(APS_CLIENT_ID, APS_CLIENT_SECRET, [
        Scopes.DataRead,
        Scopes.DataWrite,
        Scopes.DataCreate,
        Scopes.CodeAll
    ]);
    req.oAuth2LeggedToken = {
        access_token: credentials.access_token,
        expires_in: Math.round((credentials.expires_at - Date.now()) / 1000)
    };
    next();
};


service.getUserProfile = async (accessToken) => {
    const resp = await authenticationClient.getUserInfo(accessToken);
    return resp;
};


// Data Management APIs
// Format data for tree
function createTreeNode(_id, _text, _type, _children) {
    return { id: _id, text: _text, type: _type, children: _children };
}


service.getHubs = async (access_token) => {
    const resp = await dataManagementClient.getHubs({ accessToken: access_token });
    const treeNodes = resp.data.map((hub) => {
        if (hub.attributes.extension.type === 'hubs:autodesk.bim360:Account') {
            const hubType = 'bim360Hubs';
            return createTreeNode(
                hub.links.self.href,
                hub.attributes.name,
                hubType,
                true
            );
        } else
            return null;
    });
    return treeNodes.filter(node => node !== null);
};

service.getProjects = async (hubId, access_token) => {
    const resp = await dataManagementClient.getHubProjects(hubId, { accessToken: access_token });
    const treeNodes = resp.data.map((project) => {
        let projectType = 'projects';
        switch (project.attributes.extension.type) {
            case 'projects:autodesk.core:Project':
                projectType = 'a360projects';
                break;
            case 'projects:autodesk.bim360:Project':
                projectType = 'bim360projects';
                break;
        }
        return createTreeNode(
            project.links.self.href,
            project.attributes.name,
            projectType,
            true
        );
    });
    return treeNodes.filter(node => node !== null);
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


service.getFolders = async (hubId, projectId, access_token) => {
    const resp = await dataManagementClient.getProjectTopFolders(hubId, projectId, { accessToken: access_token });
    const treeNodes = resp.data.map((folder) => {
        return createTreeNode(
            folder.links.self.href,
            folder.attributes.displayName === null ? folder.attributes.name : folder.attributes.displayName,
            folder.type,
            true
        );
    });
    return treeNodes.filter(node => node !== null);
};


service.getFolderContents = async (projectId, folderId, access_token) => {
    const resp = await dataManagementClient.getFolderContents(projectId, folderId, { accessToken: access_token });
    const treeNodes = resp.data.map((item) => {
        var name = (item.attributes.displayName !== null ? item.attributes.displayName : item.attributes.name);
        // only RCM models
        if (name == '' ) { // BIM 360 Items with no displayName also don't have storage, so not file to transfer
            return null;
        } 
        if(item.attributes.extension.type == "items:autodesk.bim360:C4RModel" || item.attributes.extension.type == "items:autodesk.bim360.file" || item.attributes.extension.type == "folders:autodesk.bim360:Folder" ){
            return createTreeNode(
                item.links.self.href,
                name,
                item.type,
                true
            );
        }else{
            return null;
        }
    });
    return treeNodes.filter(node => node !== null);
};


service.getVersions = async (projectId, itemId, access_token) => {
    const resp = await dataManagementClient.getItemVersions(projectId, itemId, { accessToken: access_token });
    
    const treeNodes = resp.data.map( (version) => {
        const dateFormated = new Date(version.attributes.lastModifiedTime).toLocaleString();
        const versionst = version.id.match(/^(.*)\?version=(\d+)$/)[2];
        const viewerUrn = (version.relationships != null && version.relationships.derivatives != null && version.relationships.derivatives.data != null ? version.relationships.derivatives.data.id : null);
        return createTreeNode(
            viewerUrn,
            decodeURI('v' + versionst + ': ' + dateFormated + ' by ' + version.attributes.lastModifiedUserName),
            (viewerUrn != null ? 'versions' : 'unsupported'),
            false
        );
    })
    return treeNodes.filter(node => node !== null);
};


// Delete a folder
service.deleteFolder = async (projectId, folderId, access_token) => {
    const resp = await dataManagementClient.patchFolder(projectId, folderId, { accessToken: access_token }, { attributes: { hidden: true } });
    return resp;
};

// Create a folder
service.createFolder = async (projectId, folderData, access_token)  => {  

    let folderPayload = {
        jsonapi: { version: "1.0" },
        data: {
            type: "folders",
            attributes: { name: folderData.name, extension: { type: "folders:autodesk.bim360:Folder", version: "1.0" } },
            relationships: { parent: { data: { type: "folders", id: folderData.parentId } } }
        }
    };

    const resp = await dataManagementClient.createFolder(projectId, folderPayload, { accessToken: access_token });
    return resp;
};



service.getLatestVersion = async (projectId, itemId, token) => {
    const resp = await dataManagementClient.getItemVersions(projectId, itemId, { accessToken: token.access_token });
    return resp.data[0];
};



