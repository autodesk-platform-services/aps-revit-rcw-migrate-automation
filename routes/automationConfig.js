const express = require('express');
const _fs = require('fs');
const _path = require('path');

const { auth2LeggedMiddleware } = require('./common/aps');
const{ Utils }  = require ('./common/automationUtils')

const router = express.Router();


///////////////////////////////////////////////////////////////////////
/// Middleware for obtaining a token for each request.
///////////////////////////////////////////////////////////////////////
router.use('/designautomation', auth2LeggedMiddleware);


///////////////////////////////////////////////////////////////////////
/// Query the list of the engines
///////////////////////////////////////////////////////////////////////
router.get('/designautomation/engines', async(req, res, next) => {
    const api = Utils.dav3API(req.oAuth2LeggedToken);
    let engines = null;
    let Allengines = [];
    let paginationToken = null;
    try {
        while(true){
            engines = await api.getEngines( {"page": paginationToken});
            Allengines = Allengines.concat(engines.data);
            if (engines.paginationToken == null) {
                break;
            }
            paginationToken = engines.paginationToken;
        }
    } catch (ex) {
        console.error(ex);
        return res.status(500).json({
            diagnostic: 'Failed to get engine list'
        });
    }
    const engineList = Allengines.filter((engine) => {
        return (engine.indexOf('Revit') >= 0)
    })
    return (res.status(200).json(engineList.sort())); // return list of engines
})


///////////////////////////////////////////////////////////////////////
/// Query the list of the activities
///////////////////////////////////////////////////////////////////////
router.get('/designautomation/activities', async(req, res, next) => {
	const api = Utils.dav3API(req.oAuth2LeggedToken);
	// filter list of 
	let activities = null;
	try {
		activities = await api.getActivities();
	} catch (ex) {
		console.error(ex);
		return (res.status(500).json({
			diagnostic: 'Failed to get activity list'
		}));
	}
	let definedActivities = [];
	for (let i = 0; i < activities.data.length; i++) {
		let activity = activities.data[i];
		if (activity.startsWith(Utils.NickName) && activity.indexOf('$LATEST') === -1)
			definedActivities.push(activity.replace(Utils.NickName + '.', ''));
	}
	return(res.status(200).json(definedActivities));
})


///////////////////////////////////////////////////////////////////////
/// Query the list of the appbundle packages
///////////////////////////////////////////////////////////////////////
router.get('/appbundles', async (req, res, next) => {
    try {
        const fileArray = _fs.readdirSync(Utils.LocalBundlesFolder);
        const zipFile = fileArray.filter(fileName => {
            return (fileName.indexOf('.zip') >= 0)
        })
        res.status(200).json(zipFile);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            diagnostic: 'Failed to find appbundle list'
        });
    }
})

///////////////////////////////////////////////////////////////////////
/// Create|Update Appbundle version
///////////////////////////////////////////////////////////////////////
router.post('/designautomation/appbundles', async( req, res, next) => {
    const fileName = req.body.fileName;
    const engineName  = req.body.engine;

    const zipFileName = fileName + '.zip';
    const appBundleName = fileName + 'AppBundle';

    // check if ZIP with bundle is existing
	const localAppPath = _path.join(Utils.LocalBundlesFolder, zipFileName);
    if (!_fs.existsSync(localAppPath)) {
        console.error(`${localAppPath} is not existing`);
        return (res.status(400).json({ 
            diagnostic: `${localAppPath} is not existing`
        }));
    }

    const api = Utils.dav3API(req.oAuth2LeggedToken);
	let appBundles = null;
	try {
		appBundles = await api.getAppBundles();
	} catch (ex) {
		console.error(ex);
		return (res.status(500).json({
			diagnostic: 'Failed to get the Bundle list'
		}));
    }
    
	const qualifiedAppBundleId = `${Utils.NickName}.${appBundleName}+${Utils.Alias}`;
    var newAppVersion = null;
    if( appBundles.data.includes( qualifiedAppBundleId ) ){
 		// create new version
         const appBundleSpec = {
				engine: engineName,
				description: appBundleName
			};
		try {
			newAppVersion = await api.createAppBundleVersion(appBundleName, appBundleSpec);
		} catch (ex) {
			console.error(ex);
			return (res.status(500).json({
				diagnostic: 'Cannot create new version'
			}));
		}

		// update alias pointing to v+1
		const aliasSpec = {
				version: newAppVersion.Version
			};
		try {
			const newAlias = await api.modifyAppBundleAlias(appBundleName, Utils.Alias, aliasSpec);
		} catch (ex) {
			console.error(ex);
			return (res.status(500).json({
				diagnostic: 'Failed to create an alias'
			}));
		}   
    } else {
        const appBundleSpec = {
            package: appBundleName,
            engine: engineName,
            id: appBundleName,
            description: "Migrate Revit Cloud Model"
        };
        try {
            newAppVersion = await api.createAppBundle(appBundleSpec);
        } catch (ex) {
            console.error(ex);
            return (res.status(500).json({
                diagnostic: 'Failed to create new app'
            }));
        }

        // create alias pointing to v1
        const aliasSpec = {
            id: Utils.Alias,
            version: 1
        };
        try {
            const newAlias = await api.createAppBundleAlias(appBundleName, aliasSpec);
        } catch (ex) {
            console.error(ex);
            return (res.status(500).json({
                diagnostic: 'Failed to create an alias'
            }));
        }
    }
    const contents = _fs.readFileSync(localAppPath);
    try{
        await Utils.uploadAppBundleAsync(newAppVersion.uploadParameters, contents);
    }catch(err){
        console.error(err);
        return (res.status(500).json({
            diagnostic: "Failed to upload the package to the url."
        }));
    }
    const result = {
        AppBundle : qualifiedAppBundleId,
        Version   : newAppVersion.version
    }
    return (res.status(200).json( result ));    
})


///////////////////////////////////////////////////////////////////////
/// Create activity
///////////////////////////////////////////////////////////////////////
router.post('/designautomation/activities', async( req, res, next) => {
    const fileName = req.body.fileName;
    const engineName  = req.body.engine;

    const appBundleName = fileName + 'AppBundle';
    const activityName = fileName + 'Activity';

    const api = Utils.dav3API(req.oAuth2LeggedToken);
    let activities = null;
    try{
        activities = await api.getActivities();
    }catch(ex){
        console.error(ex);
        return res.status(500).json({
			diagnostic: 'Failed to get activity list'
        });
    }
    const qualifiedAppBundleId = `${Utils.NickName}.${appBundleName}+${Utils.Alias}`;
	const qualifiedActivityId = `${Utils.NickName}.${activityName}+${Utils.Alias}`;
    if( !activities.data.includes( qualifiedActivityId ) ){
        const activitySpec = {
            Id : activityName,
            Appbundles : [ qualifiedAppBundleId ],
            CommandLine : [ "$(engine.path)\\\\revitcoreconsole.exe /i \"$(args[rvtFile].path)\" /al \"$(appbundles[" + appBundleName + "].path)\"" ],           
            Engine : engineName,
            Parameters :
            {
                rvtFile: {
                    verb: "get",
                    description: "Input Revit model file (downloaded from URL)",
                    required: false
                },
                inputParams: {
                    verb: "get",
                    description: "Input parameters JSON file including location of the target cloud model",
                    localName: "params.json",
                    required: false
                }
            }
        }
		try {
			const newActivity = await api.createActivity(activitySpec);
		} catch (ex) {
			console.error(ex);
			return (res.status(500).json({
				diagnostic: 'Failed to create new activity'
			}));
		}
		// specify the alias for this Activity
		const aliasSpec = {
			id: Utils.Alias,
			version: 1
		};
		try {
			const newAlias = await api.createActivityAlias(activityName, aliasSpec);
		} catch (ex) {
			console.error(ex);
			return (res.status(500).json({
				diagnostic: 'Failed to create new alias for activity'
			}));
		}
        return res.status(200).json({
            Activity : qualifiedActivityId,
            Status : "Created"
        });
    }
    return res.status(200).json({
        Activity : qualifiedActivityId,
        Status : "Existing"
    });

})


///////////////////////////////////////////////////////////////////////
/// Delete appbundle from Desigan Automation server
///////////////////////////////////////////////////////////////////////
router.delete('/designautomation/appbundles/:appbundle_name', async(req, res, next) =>{
    const appbundle_name = req.params.appbundle_name;
    const api = Utils.dav3API(req.oAuth2LeggedToken);
    try{
        await api.deleteAppBundle( appbundle_name );
    }catch(ex){
        console.error(ex);
        return res.status(500).json({
            diagnostic: 'Failed to delete the bundle'
        });
    }
    return res.status(204).end();
})



///////////////////////////////////////////////////////////////////////
/// Delete activity from design automation server
///////////////////////////////////////////////////////////////////////
router.delete('/designautomation/activities/:activity_name', async(req, res, next) =>{
    const activity_name = req.params.activity_name;
    const api = Utils.dav3API(req.oAuth2LeggedToken);
    try{
        await api.deleteActivity( activity_name );
    }catch(ex){
        console.error(ex);
        return res.status(500).json({
            diagnostic: 'Failed to delete the activity'
        });
    }
    return res.status(204).end();
})

module.exports = router;
