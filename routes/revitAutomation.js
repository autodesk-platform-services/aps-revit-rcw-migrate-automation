const express = require('express');
const { authRefreshMiddleware, auth2LeggedMiddleware, getHubFromProjectId, getLatestVersion } = require('./common/aps');
const { Utils } = require('./common/automationUtils');


const SOCKET_TOPIC_WORKITEM = 'Workitem-Notification';
var workitemList = [];

let router = express.Router();


// Middleware for obtaining a 2 legged token for each Automation request.
router.use('/da4revit', authRefreshMiddleware);
router.use('/da4revit', auth2LeggedMiddleware);


router.post('/da4revit/v1/upgrader/files/:source_file_url/folders/:destinate_folder_url', async (req, res, next) => {
    const sourceFileUrl = (req.params.source_file_url);
    const destinateFolderUrl = (req.params.destinate_folder_url);
    if (sourceFileUrl === '' || destinateFolderUrl === '') {
        res.status(400).end('make sure sourceFile and destinateFolder have correct value');
        return;
    }
    const sourceFileParams = sourceFileUrl.split('/');
    const destinateFolderParams = destinateFolderUrl.split('/');
    if (sourceFileParams.length < 3 || destinateFolderParams.length < 3) {
        console.log('info: the url format is not correct');
        res.status(400).end('the url format is not correct');
        return;
    }

    const sourceFileType = sourceFileParams[sourceFileParams.length - 2];
    const destinateFolderType = destinateFolderParams[destinateFolderParams.length - 2];
    if (sourceFileType !== 'items' || destinateFolderType !== 'folders') {
        console.log('info: not supported item');
        res.status(400).end('not supported item');
        return;
    }

    const sourceFileId = sourceFileParams[sourceFileParams.length - 1];
    const sourceProjectId = sourceFileParams[sourceFileParams.length - 3];

    const destinateFolderId = destinateFolderParams[destinateFolderParams.length - 1];
    const destinateProjectId = destinateFolderParams[destinateFolderParams.length - 3];

    // get the storage of the input item version
    const versionInfo = await getLatestVersion(sourceProjectId, sourceFileId, req.oAuth3LeggedToken);
    if (versionInfo === null) {
        console.log('error: failed to get lastest version of the file');
        res.status(500).end('failed to get lastest version of the file');
        return;
    }

    const inputStorageId = versionInfo.relationships.storage.data.id;
    const fileName = versionInfo.attributes.name;
    const verstionType = versionInfo.attributes.extension.type;
    if (verstionType !== 'versions:autodesk.bim360:C4RModel') {
        console.log('info: only RCM is supported');
        res.status(500).end('only RCM is supported');
        return;
    }

    const hubInfo = await getHubFromProjectId(destinateProjectId, req.oAuth3LeggedToken);
    if (hubInfo === null) {
        console.log('error: failed to get the target hub');
        res.status(500).end('failed to get the target hub');
        return;
    }
    const targetAccountGuid = hubInfo.id;
    var inputJson = {
        TargetAccountGuid: targetAccountGuid.split('.')[1],
        TargetProjectGuid: destinateProjectId.split('.')[1],
        TargetFolderUrn: destinateFolderId,
        TargetModelName: fileName
    };

    const inputRvtFileArg = {
        url: inputStorageId,
        Headers: {
            Authorization: 'Bearer ' + req.oAuth3LeggedToken.access_token
        }
    }
    const inputParamsArg = {
        url: "data:application/json, " + JSON.stringify(inputJson).replace(/"/g, "'")
    }
    const onCompleteArg = {
        verb: "post",
        url: `${Utils.CallBackUrl}`,
    }
    const workitemBody = {
        activityId: `${Utils.NickName}.${Utils.ActivityName}+${Utils.Alias}`,
        arguments: {
            rvtFile: inputRvtFileArg,
            inputParams: inputParamsArg,
            onComplete: onCompleteArg,
            adsk3LeggedToken: req.oAuth3LeggedToken.access_token
        }
    }
    const api = Utils.dav3API(req.oAuth2LeggedToken);
    let workItemStatus = null;
    try {
        workItemStatus = await api.createWorkItem(workitemBody);
    } catch (ex) {
        console.error(ex);
        const workitemStatus = {
            'Status': "Failed"
        };
        global.MyApp.SocketIo.emit(SOCKET_TOPIC_WORKITEM, workitemStatus);
        return (res.status(500).json({
            diagnostic: 'Failed to execute workitem'
        }));
    }
    console.log('Submitted the workitem: ' + workItemStatus.id);
    workitemList.push({
        workitemId: workItemStatus.id
    })

    const upgradeInfo = {
        "fileName": fileName,
        "workItemId": workItemStatus.id,
        "workItemStatus": workItemStatus.status
    };
    return (res.status(200).end(JSON.stringify(upgradeInfo)));
});


///////////////////////////////////////////////////////////////////////
/// Cancel the file upgrade process if possible.
/// NOTE: This may not successful if the upgrade process is already started
///////////////////////////////////////////////////////////////////////
router.delete('/da4revit/v1/upgrader/files/:file_workitem_id', async (req, res, next) => {

    const workitemId = req.params.file_workitem_id;
    try {

        const api = Utils.dav3API(req.oAuth2LeggedToken);
        await api.deleteWorkitem(workitemId);
        const workitem = workitemList.find((item) => {
            return item.workitemId === workitemId;
        })
        if (workitem === undefined) {
            console.log('the workitem is not in the list')
            return;
        }
        console.log('The workitem: ' + workitemId + ' is cancelled')
        let index = workitemList.indexOf(workitem);
        workitemList.splice(index, 1);
        
        let workitemStatus = {
            'WorkitemId': workitemId,
            'Status': "Cancelled"
        };
        global.MyApp.SocketIo.emit(SOCKET_TOPIC_WORKITEM, workitemStatus);
        return (res.status(204).end());
    } catch (err) {
        return (res.status(500).end("error"));
    }
})

///////////////////////////////////////////////////////////////////////
/// Query the status of the file
///////////////////////////////////////////////////////////////////////
router.get('/da4revit/v1/upgrader/files/:file_workitem_id', async (req, res, next) => {
    const workitemId = req.params.file_workitem_id;
    try {
        const api = Utils.dav3API(req.oAuth2LeggedToken);
        let workitemRes =await api.getWorkitemStatus(workitemId);
        return (res.status(200).end(JSON.stringify(workitemRes)));
    } catch (err) {
        return (res.status(500).end("error"));
    }
})


///////////////////////////////////////////////////////////////////////
///
///////////////////////////////////////////////////////////////////////
router.post('/callback/designautomation', async (req, res, next) => {
    // Best practice is to tell immediately that you got the call
    // so return the HTTP call and proceed with the business logic
    res.status(202).end();

    let workitemStatus = {
        'WorkitemId': req.body.id,
        'Status': "Success"
    };
    if (req.body.status === 'success') {
        const workitem = workitemList.find((item) => {
            return item.workitemId === req.body.id;
        })

        if (workitem === undefined) {
            console.log('The workitem: ' + req.body.id + ' to callback is not in the item list')
            return;
        }
        let index = workitemList.indexOf(workitem);
        workitemStatus.Status = 'Completed';
        global.MyApp.SocketIo.emit(SOCKET_TOPIC_WORKITEM, workitemStatus);
        workitemList.splice(index, 1);

        console.log("Completed the workitem:  " + workitem.workitemId);
    } else {
        // Report if not successful.
        workitemStatus.Status = 'Failed';
        global.MyApp.SocketIo.emit(SOCKET_TOPIC_WORKITEM, workitemStatus);
        console.log(req.body);
    }
    return;
})

module.exports = router;
