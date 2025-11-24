const express = require('express');
const { authRefreshMiddleware, getHubs, getProjects, getFolders, getFolderContents, getVersions, createFolder, deleteFolder } = require('./common/aps.js');
let router = express.Router();

// Middleware for obtaining a 3 legged token for each request.
router.use('/api/hubs', authRefreshMiddleware);

router.get('/api/hubs', async (req, res) => {
    // The id querystring parameter contains what was selected on the UI tree, make sure it's valid
    const href = decodeURIComponent(req.query.id);
    if (href === '') {
        res.status(500).end();
        return;
    }
    if (href === '#') {
        // If href is '#', it's the root tree node
        const treeNodes = await getHubs(req.oAuth3LeggedToken.access_token);
        res.json(treeNodes);
    } else {
        // Otherwise let's break it by '/'
        const params = href.split('/');
        const resourceName = params[params.length - 2];
        const resourceId = params[params.length - 1];
        let treeNodes = [];
        switch (resourceName) {
            case 'hubs':
                treeNodes = await getProjects(resourceId, req.oAuth3LeggedToken.access_token);
                res.json(treeNodes);
                break;
            case 'projects':
                // For a project, first we need the top/root folder
                const hubId = params[params.length - 3];
                treeNodes = await getFolders(hubId, resourceId/*project_id*/, req.oAuth3LeggedToken.access_token);
                res.json(treeNodes);
                break;
            case 'folders':
                {
                    const projectId = params[params.length - 3];
                    treeNodes = await getFolderContents(projectId, resourceId/*folder_id*/, req.oAuth3LeggedToken.access_token);
                    res.json(treeNodes);
                    break;
                }
            case 'items':
                {
                    const projectId = params[params.length - 3];
                    treeNodes = await getVersions(projectId, resourceId/*item_id*/, req.oAuth3LeggedToken.access_token);
                    res.json(treeNodes);
                    break;
                }
        }
    }
});

// delete a folder
router.delete('/api/hubs/folder/:folder_url', async (req, res) => {
    const href = req.params.folder_url;
    if (href === '' || href === null) {
        res.status(400).end('the folder url is not specified');
        return;
    }

    const params = href.split('/');
    if (params.length < 3) {
        res.status(400).end('the folder url is not in correct format ');
        return;
    }
    const projectId = params[params.length - 3];
    const folderId = params[params.length - 1];

    try {
        await deleteFolder(projectId, folderId, req.oAuth3LeggedToken.access_token);
        res.status(204).end();
    } catch (err) {
        console.log('failed to delete a folder.');
        console.log(err);
        res.status(500).end("error");
    }
})

// create a subfolder
router.post('/api/hubs/folder', async (req, res) => {
    const href = req.body.id;
    const folderName = req.body.name;
    if (href === '' || folderName === '') {
        res.status(500).end();
        return;
    }

    if (href === '#') {
        res.status(500).end('not supported item');
        return;
    }

    const params = href.split('/');
    if (params.length < 3) {
        res.status(500).end('selected item id has problem');
        return;
    }

    const resourceName = params[params.length - 2];
    if (resourceName !== 'folders') {
        res.status(500).end('not supported item');
        return;
    }

    const projectId = params[params.length - 3];
    const folderId = params[params.length - 1];

    try {
        const newFolder = await createFolder(projectId, { name: folderName, parentId: folderId }, req.oAuth3LeggedToken.access_token);
        console.log(newFolder);
        let folderInfo = {
            id: newFolder.links.self.href,
            type: newFolder.data.type
        }
        res.status(200).end(JSON.stringify(folderInfo));
    } catch (err) {
        console.log('failed to create a folder.');
        res.status(500).end('failed to create a folder.');
    }
})


module.exports = router;
