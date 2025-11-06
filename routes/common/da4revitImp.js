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
const request = require("request");

const { designAutomation }= require('../../config');

const {
    ProjectsApi, 
    ItemsApi,
    StorageRelationshipsTarget,
    CreateStorageDataRelationships,
    CreateStorageDataAttributes,
    CreateStorageData,
    CreateStorage,
    CreateVersion,
    CreateVersionData,
    CreateVersionDataRelationships,
    CreateItemRelationshipsStorageData,
    CreateItemRelationshipsStorage,
    CreateVersionDataRelationshipsItem,
    CreateVersionDataRelationshipsItemData,

    StorageRelationshipsTargetData,
    BaseAttributesExtensionObject,
} = require('forge-apis');

const AUTODESK_HUB_BUCKET_KEY = 'wip.dm.prod';
var workitemList = [];


///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
function getWorkitemStatus(workItemId, access_token) {

    return new Promise(function (resolve, reject) {

        var options = {
            method: 'GET',
            url: designAutomation.endpoint +'workitems/'+ workItemId,
            headers: {
                Authorization: 'Bearer ' + access_token,
                'Content-Type': 'application/json'
            }
        };

        request(options, function (error, response, body) {
            if (error) {
                reject(err);
            } else {
                let resp;
                try {
                    resp = JSON.parse(body)
                } catch (e) {
                    resp = body
                }
                if (response.statusCode >= 400) {
                    console.log('error code: ' + response.statusCode + ' response message: ' + response.statusMessage);
                    reject({
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage
                    });
                } else {
                    resolve({
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: resp
                    });
                }
            }
        });
    });
}

///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
function cancelWorkitem(workItemId, access_token) {

    return new Promise(function (resolve, reject) {

        var options = {
            method: 'DELETE',
            url: designAutomation.endpoint +'workitems/'+ workItemId,
            headers: {
                Authorization: 'Bearer ' + access_token,
                'Content-Type': 'application/json'
            }
        };

        request(options, function (error, response, body) {
            if (error) {
                reject(err);
            } else {
                let resp;
                try {
                    resp = JSON.parse(body)
                } catch (e) {
                    resp = body
                }
                if (response.statusCode >= 400) {
                    console.log('error code: ' + response.statusCode + ' response message: ' + response.statusMessage);
                    reject({
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage
                    });
                } else {
                    resolve({
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: resp
                    });
                }
            }
        });
    });
}



///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
function upgradeFile(inputUrl, inputJson,  access_token_3Legged, access_token_2Legged) {

    return new Promise(function (resolve, reject) {





        const workitemBody = createPostWorkitemBody(inputUrl, inputJson, access_token_3Legged.access_token);
        if( workitemBody === null){
            reject('workitem request body is null');
        }
    
        var options = {
            method: 'POST',
            url: designAutomation.endpoint+'workitems',
            headers: {
                Authorization: 'Bearer ' + access_token_2Legged.access_token,
                'Content-Type': 'application/json'
            },
            body: workitemBody,
            json: true
        };
        console.log(options);

        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                let resp;
                try {
                    resp = JSON.parse(body)
                } catch (e) {
                    resp = body
                }
                workitemList.push({
                    workitemId: resp.id
                })

                if (response.statusCode >= 400) {
                    console.log('error code: ' + response.statusCode + ' response message: ' + response.statusMessage);
                    reject({
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage
                    });
                } else {
                    resolve({
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: resp
                    });
                }
            }
        });
    })
}



///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
async function migrateRCW( requestBody, access_token_3Legged, access_token_2Legged) {

    return new Promise(async function (resolve, reject) {
        try {
            // Extract source file URL and target model info from requestBody
            const sourceFileUrl = requestBody.sourceFileUrl;
            const targetModel = requestBody.targetModel;
            
            if (!sourceFileUrl) {
                reject(new Error('sourceFileUrl is required in requestBody'));
                return;
            }

            // Create params.json content with target cloud model info
            // The file path will be automatically detected by the plugin from the rvtFile argument
            // In Design Automation, the file is downloaded to a local path accessible via $(args[rvtFile].path)
            // The plugin will use a default path or detect the file automatically
            const paramsJson = {
                InputFilePath: "input.rvt", // Default path - Design Automation will download rvtFile to this location or plugin will auto-detect
                TargetAccountGuid: targetModel.accountGuid || "",
                TargetProjectGuid: targetModel.projectGuid || "",
                TargetFolderUrn: targetModel.folderUrn || "",
                TargetModelName: targetModel.modelName || ""
            };

            // Upload params.json to OSS storage and get download URL
            const paramsJsonContent = JSON.stringify(paramsJson);
            const paramsStorage = await createTemporaryStorage(paramsJsonContent, access_token_3Legged);
            if (!paramsStorage || !paramsStorage.downloadUrl) {
                reject(new Error('Failed to create storage for params.json'));
                return;
            }

            // Create workitem body with rvtFile and inputParams
            const workitemBody = {
                activityId:  designAutomation.nickname + '.'+designAutomation.activity_name+'+'+designAutomation.appbundle_activity_alias,
                arguments: {
                    rvtFile: {
                        verb: "get",
                        url: sourceFileUrl,
                        Headers: {
                            Authorization: 'Bearer ' + access_token_3Legged.access_token
                        }
                    },
                    inputParams: {
                        verb: "get",
                        url: paramsStorage.downloadUrl,
                        Headers: {
                            Authorization: 'Bearer ' + access_token_3Legged.access_token
                        }
                    },
                    onComplete: {
                        verb: "post",
                        url: designAutomation.webhook_url
                    }
                }
            };
 
            var options = {
                method: 'POST',
                url: designAutomation.endpoint+'workitems',
                headers: {
                    Authorization: 'Bearer ' + access_token_2Legged.access_token,
                    'Content-Type': 'application/json'
                },
                body: workitemBody,
                json: true
            };
            console.log(options);

            request(options, function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    let resp;
                    try {
                        resp = JSON.parse(body)
                    } catch (e) {
                        resp = body
                    }
                    
                    const projectId = targetModel.projectGuid || "";
                    workitemList.push({
                        workitemId: resp.id,
                        projectId: projectId
                    })

                    if (response.statusCode >= 400) {
                        console.log('error code: ' + response.statusCode + ' response message: ' + response.statusMessage);
                        reject({
                            statusCode: response.statusCode,
                            statusMessage: response.statusMessage
                        });
                    } else {
                        resolve({
                            statusCode: response.statusCode,
                            headers: response.headers,
                            body: resp
                        });
                    }
                }
            });
        } catch (err) {
            reject(err);
        }
    })
}

// Helper function to create temporary storage for params.json
async function createTemporaryStorage(content, access_token) {
    return new Promise(function (resolve, reject) {
        const BucketsApi = require('forge-apis').BucketsApi;
        const bucketsApi = new BucketsApi();
        
        // Use a temporary bucket or create one
        const bucketKey = AUTODESK_HUB_BUCKET_KEY;
        const objectName = 'params_' + Date.now() + '.json';
        
        // Upload to OSS
        const options = {
            method: 'PUT',
            url: `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${objectName}`,
            headers: {
                Authorization: 'Bearer ' + access_token.access_token,
                'Content-Type': 'application/json'
            },
            body: content
        };

        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else if (response.statusCode >= 400) {
                reject(new Error('Failed to upload params.json: ' + response.statusMessage));
            } else {
                // Get signed download URL
                const downloadUrl = `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectName)}`;
                resolve({ downloadUrl: downloadUrl });
            }
        });
    });
}
///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
async function getLatestVersionInfo(projectId, fileId, oauth_client, oauth_token) {
    if (projectId === '' || fileId === '') {
        console.log('failed to get lastest version of the file');
        return null;
    }

    // get the storage of the input item version
    const versionItem = await getLatestVersion(projectId, fileId, oauth_client, oauth_token);
    if (versionItem === null) {
        console.log('failed to get lastest version of the file');
        return null;
    }
    return {
        "versionStorageId": versionItem.relationships.storage.data.id,
        "versionType": versionItem.attributes.extension.type
    };
}


///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
async function getLatestVersion(projectId, itemId, oauthClient, credentials) {
    const items = new ItemsApi();
    const versions = await items.getItemVersions(projectId, itemId, {}, oauthClient, credentials);
    if(versions === null || versions.statusCode !== 200 ){
        console.log('failed to get the versions of file');
        res.status(500).end('failed to get the versions of file');
        return null;
    }
    return versions.body.data[0];
}


///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
async function getNewCreatedStorageInfo(projectId, folderId, fileName, oauth_client, oauth_token) {

    // create body for Post Storage request
    let createStorageBody = createBodyOfPostStorage(folderId, fileName);

    const project = new ProjectsApi();
    let storage = await project.postStorage(projectId, createStorageBody, oauth_client, oauth_token);
    if (storage === null || storage.statusCode !== 201) {
        console.log('failed to create a storage.');
        return null;
    }
    return {
        "StorageId": storage.body.data.id
    };
}


///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
function createBodyOfPostItem( fileName, folderId, storageId, itemType, versionType){
    const body = 
    {
        "jsonapi":{
            "version":"1.0"
        },
        "data":{
            "type":"items",
            "attributes":{
                "name":fileName,
                "extension":{
                    "type":itemType,
                    "version":"1.0"
                }
            },
            "relationships":{
                "tip":{
                    "data":{
                        "type":"versions",
                        "id":"1"
                    }
                },
                "parent":{
                    "data":{
                        "type":"folders",
                        "id":folderId
                    }
                }
            }
        },
        "included":[
            {
                "type":"versions",
                "id":"1",
                "attributes":{
                    "name":fileName,
                    "extension":{
                        "type":versionType,
                        "version":"1.0"
                    }
                },
                "relationships":{
                    "storage":{
                        "data":{
                            "type":"objects",
                            "id":storageId
                        }
                    }
                }
            }
        ]
    };
    return body;
}



///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
function createBodyOfPostStorage(folderId, fileName) {
    // create a new storage for the ouput item version
    let createStorage = new CreateStorage();
    let storageRelationshipsTargetData = new StorageRelationshipsTargetData("folders", folderId);
    let storageRelationshipsTarget = new StorageRelationshipsTarget;
    let createStorageDataRelationships = new CreateStorageDataRelationships();
    let createStorageData = new CreateStorageData();
    let createStorageDataAttributes = new CreateStorageDataAttributes();

    createStorageDataAttributes.name = fileName;
    storageRelationshipsTarget.data = storageRelationshipsTargetData;
    createStorageDataRelationships.target = storageRelationshipsTarget;
    createStorageData.relationships = createStorageDataRelationships;
    createStorageData.type = 'objects';
    createStorageData.attributes = createStorageDataAttributes;
    createStorage.data = createStorageData;
    
    return createStorage;
}



///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
function createBodyOfPostVersion(fileId, fileName, storageId, versionType) {

    let createVersionDataRelationshipsItem = new CreateVersionDataRelationshipsItem();
    let createVersionDataRelationshipsItemData = new CreateVersionDataRelationshipsItemData();
    createVersionDataRelationshipsItemData.type = "items";
    createVersionDataRelationshipsItemData.id = fileId;
    createVersionDataRelationshipsItem.data = createVersionDataRelationshipsItemData;

    let createItemRelationshipsStorage = new CreateItemRelationshipsStorage();
    let createItemRelationshipsStorageData = new CreateItemRelationshipsStorageData();
    createItemRelationshipsStorageData.type = "objects";
    createItemRelationshipsStorageData.id = storageId;
    createItemRelationshipsStorage.data = createItemRelationshipsStorageData;

    let createVersionDataRelationships = new CreateVersionDataRelationships();
    createVersionDataRelationships.item = createVersionDataRelationshipsItem;
    createVersionDataRelationships.storage = createItemRelationshipsStorage;

    let baseAttributesExtensionObject = new BaseAttributesExtensionObject();
    baseAttributesExtensionObject.type = versionType;
    baseAttributesExtensionObject.version = "1.0";

    let createStorageDataAttributes = new CreateStorageDataAttributes();
    createStorageDataAttributes.name = fileName;
    createStorageDataAttributes.extension = baseAttributesExtensionObject;

    let createVersionData = new CreateVersionData();
    createVersionData.type = "versions";
    createVersionData.attributes = createStorageDataAttributes;
    createVersionData.relationships = createVersionDataRelationships;

    let createVersion = new CreateVersion();
    createVersion.data = createVersionData;

    return createVersion;
}


///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
function createPostWorkitemBody(inputUrl, inputJson, access_token) {

    let body = null;
    body = {
        activityId:  designAutomation.nickname + '.'+designAutomation.activity_name+'+'+designAutomation.appbundle_activity_alias,
        arguments: {
            rvtFile: {
                url: inputUrl,
                Headers: {
                    Authorization: 'Bearer ' + access_token
                },
            },
            inputParams: {
                url: "data:application/json," + JSON.stringify(inputJson)
            },
            onComplete: {
                verb: "post",
                url: designAutomation.webhook_url
            },
            adsk3LeggedToken: access_token
        }
    };

    return body;
}


module.exports = 
{ 
    getWorkitemStatus, 
    cancelWorkitem, 
    upgradeFile, 
    getLatestVersionInfo, 
    getNewCreatedStorageInfo, 
    createBodyOfPostVersion,
    createBodyOfPostItem,
    workitemList 
};
