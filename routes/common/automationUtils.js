const request = require("request");
const _path = require('path');
const _fs = require('fs');
const _url = require('url');
const { APS_CLIENT_ID, APS_WEBHOOK_URL,APS_AUTOMATION_NICKNAME, APS_AUTOMATION_ALIAS, APS_AUTOMATION_ACTIVITY_NAME, APS_AUTOMATION_CLIENT_SETTINGS } = require('../../config');
const dav3 = require('autodesk.forge.designautomation');


class Utils {
	static get LocalBundlesFolder() {
		return (_path.resolve(_path.join(__dirname, '../..', 'wwwroot/bundles')));
	}

	static get NickName() {
		return APS_AUTOMATION_NICKNAME? APS_AUTOMATION_NICKNAME : APS_CLIENT_ID;
	}

	static get Alias() {
		return APS_AUTOMATION_ALIAS? APS_AUTOMATION_ALIAS : 'dev';
	}

	static get CallBackUrl() {
		return APS_WEBHOOK_URL;
	}

	static get ActivityName() {
		return APS_AUTOMATION_ACTIVITY_NAME? APS_AUTOMATION_ACTIVITY_NAME : 'RCWMigratorAppActivity';
	}

	static async findFiles(dir, filter) {
		return (new Promise((fulfill, reject) => {
			_fs.readdir(dir, (err, files) => {
				if (err)
					return (reject(err));
				if (filter !== undefined && typeof filter === 'string')
					files = files.filter((file) => {
						return (_path.extname(file) === filter);
					});
				else if (filter !== undefined && typeof filter === 'object')
					files = files.filter((file) => {
						return (filter.test(file));
					});
				fulfill(files);
			});
		}));
	}

	static dav3API(oauth2) {
		let apiClient = new dav3.AutodeskForgeDesignAutomationClient( APS_AUTOMATION_CLIENT_SETTINGS);
		apiClient.authManager.authentications['2-legged'].accessToken = oauth2.access_token;
		return (new dav3.AutodeskForgeDesignAutomationApi(apiClient));
	}


	static FormDataLength(form) {
		return (new Promise((fulfill, reject) => {
			form.getLength((err, length) => {
				if (err)
					return (reject(err));
				fulfill(length);
			});
		}));
	}

	static uploadFormDataWithFile(filepath, endpoint, params = null) {
		return (new Promise(async (fulfill, reject) => {
			const fileStream = _fs.createReadStream(filepath);

			const form = new formdata();
			if (params) {
				const keys = Object.keys(params);
				for (let i = 0; i < keys.length; i++)
					form.append(keys[i], params[keys[i]]);
			}
			form.append('file', fileStream);

			let headers = form.getHeaders();
			headers['Cache-Control'] = 'no-cache';
			headers['Content-Length'] = await Utils.FormDataLength(form);

			const urlinfo = _url.parse(endpoint);
			const postReq = http.request({
					host: urlinfo.host,
					port: (urlinfo.port || (urlinfo.protocol === 'https:' ? 443 : 80)),
					path: urlinfo.pathname,
					method: 'POST',
					headers: headers
				},
				response => {
					fulfill(response.statusCode);
				},
				err => {
					reject(err);
				}
			);

			form.pipe(postReq);
		}));
    }
    

    static uploadAppBundleAsync( field, data) {
    
        return new Promise(function (resolve, reject) {
            let myData = field.formData;
            myData.file = data;
    
            var options = {
                method: 'POST',
                url: field.endpointURL,
                formData: myData,
                headers: {
                    'content-type': 'multipart/form-data'
                },
            };
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
}


module.exports = 
{ 
    Utils
};
    