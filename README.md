# Migrate Revit Cloud Worksharing Models with Design Automation

[![Node.js](https://img.shields.io/badge/Node.js-14.0-blue.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-6.0-blue.svg)](https://www.npmjs.com/)
![Platforms](https://img.shields.io/badge/Web-Windows%20%7C%20MacOS%20%7C%20Linux-lightgray.svg)

[![OAuth2](https://img.shields.io/badge/OAuth2-v2-green.svg)](http://developer.autodesk.com/)
[![Data-Management](https://img.shields.io/badge/Data%20Management-v1-green.svg)](http://developer.autodesk.com/)
[![Design-Automation](https://img.shields.io/badge/Design%20Automation-v3-green.svg)](http://developer.autodesk.com/)


![Windows](https://img.shields.io/badge/Plugins-Windows-lightgrey.svg)
![.NET](https://img.shields.io/badge/.NET%20Framework-4.8-blue.svg)
[![Revit-2025](https://img.shields.io/badge/Revit-2025%20%7C%202026-lightgrey.svg)](http://autodesk.com/revit)


![Advanced](https://img.shields.io/badge/Level-Advanced-red.svg)
[![MIT](https://img.shields.io/badge/License-MIT-blue.svg)](http://opensource.org/licenses/MIT)

# Description

This sample demonstrates how to migrate Revit Cloud Worksharing (RCW) models from one BIM 360/ACC project to another using Design Automation for Revit API. The application supports migrating RCW models (C4RModel type) to the latest Revit versions (2025, 2026) and can handle individual files or entire folders.


# Thumbnail
![thumbnail](/thumbnail.png)

## Key Features

### 🔐 Authentication & Authorization
- **Three-legged OAuth 2.0** for BIM 360/ACC account access with automatic token refresh
- **Two-legged OAuth** for Design Automation API calls
- **BIM 360/ACC Account Provisioning** workflow with step-by-step guidance

### 📁 Data Management
- **Interactive Tree Browser** for navigating BIM 360/ACC hubs, projects, and folders
- **Dual-panel Interface** for selecting source files/folders and destination folders
- **Folder Management** - Create and delete folders directly from the interface
- **Version Control** - Automatically retrieves and migrates the latest version of RCW models

### 🔄 Migration Capabilities
- **Batch Folder Migration** - Migrate entire folders containing multiple RCW models (up to 5 files for demo)
- **Conflict Resolution** - Choose to skip or override existing files in destination
- **Linked Models Support** - migrating models with Revit links is not supported

### ⚙️ Automation Management
- **Automatic Configuration** - One-click setup of AppBundles and Activities via Configure button
- **AppBundle Versioning** - Automatically creates new versions when plugins are updated
- **Multiple Revit Engines** - Support for Revit 2025 and 2026 engines

### 📊 Real-time Progress Tracking
- **Socket.IO Integration** - Live updates on workitem status
- **Progress Dashboard** - Visual feedback showing migration status for each file
- **Workitem Monitoring** - Query and track individual workitem status
- **Cancel Operations** - Ability to cancel in-progress workitems

### 🔌 Revit Plugins
- **RCWMigratorPlugin** - Core plugin for migrating RCW models between projects

# Main Parts of The Work
1. Create a Revit Plugin to be used within AppBundle of Design Automation for Revit. Please check [PlugIn](./RCWMigratorPlugin/) 
2. Create your App, upload the AppBundle, define your Activity, you can simply use the `**Configure**` button in the Web Application to create the Appbundle & Activity.
3. Create the Web App to call the workitem for RCW model migration.

# Web App Setup

## Prerequisites

1. **APS Account**: Learn how to create a APS Account, activate subscription and create an app at [this tutorial](https://tutorials.autodesk.io/). 
2. **Visual Code**: Visual Code (Windows or MacOS).
3. **ngrok**: Routing tool, [download here](https://ngrok.com/)
4. **Revit 2025 or 2026**: required to compile changes into the plugin
5. **JavaScript ES6** syntax for server-side.
6. **JavaScript** basic knowledge with **jQuery**
7. **BIM 360 or ACC Account**: Required for accessing and migrating RCW models


For using this sample, you need an Autodesk developer credentials. Visit the [Autodesk Developer Portal](https://developer.autodesk.com), sign up for an account, then [create an app](https://developer.autodesk.com/myapps/create). For this new app, use **http://localhost:3000/api/aps/callback/oauth** as Callback URL, although is not used on 2-legged flow. Finally take note of the **Client ID** and **Client Secret**.

## Running locally

Install [NodeJS](https://nodejs.org), version 14 or newer.

Clone this project or download it (this `nodejs` branch only). It's recommended to install [GitHub desktop](https://desktop.github.com/). To clone it via command line, use the following (**Terminal** on MacOSX/Linux, **Git Shell** on Windows):

    git clone https://github.com/Autodesk-Platform-Services/aps-revit-rcw-migrate-automation

Install the required packages using `npm install`.

### ngrok

Run `ngrok http 3000` to create a tunnel to your local machine, then copy the address into the `APS_WEBHOOK_URL` environment variable. Please check [WebHooks](https://aps.autodesk.com/en/docs/webhooks/v1/tutorials/configuring-your-server/) for details.

### Environment variables

Set the enviroment variables with your client ID & secret and finally start it. Via command line, navigate to the folder where this repository was cloned and use the following:

Mac OSX/Linux (Terminal)

    npm install
    export APS_CLIENT_ID=<<YOUR CLIENT ID FROM DEVELOPER PORTAL>>
    export APS_CLIENT_SECRET=<<YOUR CLIENT SECRET>>
    export APS_CALLBACK_URL=<<YOUR CALLBACK URL>>
    export APS_WEBHOOK_URL=<<YOUR DESIGN AUTOMATION FOR REVIT CALLBACK URL>>
    npm start

Windows (use **Node.js command line** from Start menu)

    npm install
    set APS_CLIENT_ID=<<YOUR CLIENT ID FROM DEVELOPER PORTAL>>
    set APS_CLIENT_SECRET=<<YOUR CLIENT SECRET>>
    set APS_CALLBACK_URL=<<YOUR CALLBACK URL>>
    set APS_WEBHOOK_URL=<<YOUR DESIGN AUTOMATION FOR REVIT CALLBACK URL>>
    npm start

**Note.**
environment variable examples:
- APS_CALLBACK_URL: `http://localhost:3000/callback/oauth`
- APS_WEBHOOK_URL: `http://808efcdc123456.ngrok.io/callback/designautomation`

The following are optional:
- APS_AUTOMATION_NICKNAME: Only necessary if your APS app has a nickname, otherwise **APS Client ID** will be used by default.
- APS_AUTOMATION_ACTIVITY_NAME: Only necessary if the activity name is customized, **RCWMigratorAppActivity** will be used by default.
- APS_AUTOMATION_ALIAS: Only necessary if the activity alias is customized, **dev** by default.

### Using the app

Open the browser: [http://localhost:3000](http://localhost:3000), migrate RCW models: Select Source Folder containing multiple RCW models and Destination Folder, then click `Upgrade`. It will migrate all RCW models under the source folder to the destination folder.

`Note`: 
- Before using the app, you must click the `Configure` button to create the AppBundle & Activity. Please check the video for the steps at [https://youtu.be/1NCeH7acIko](https://youtu.be/1NCeH7acIko)
- Only Revit Cloud Worksharing (RCW) models (C4RModel type) are supported. Standard Revit files (RVT, RFA, RTE) are not supported by this migrator.

## Deployment

To deploy this application to Heroku, the **Callback URL** for APS must use your `.herokuapp.com` address. After clicking on the button below, at the Heroku Create New App page, set your Client ID, Secret, Callback URL and Revit Design Automation variables for APS.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/Autodesk-Platform-Services/aps-revit-rcw-migrate-automation)

Watch [this video](https://www.youtube.com/watch?v=Oqa9O20Gj0c) as reference on how to deploy samples to Heroku.



## Packages used

The [Autodesk APS](https://www.npmjs.com/package/forge-apis) packages is included by default. Some other non-Autodesk packaged are used, including [socket.io](https://www.npmjs.com/package/socket.io), [express](https://www.npmjs.com/package/express).

## Further Reading

Documentation:
- [Design Automation API](https://aps.autodesk.com/en/docs/design-automation/v3/developers_guide/overview/)
- [BIM 360 API](https://developer.autodesk.com/en/docs/bim360/v1/overview/) and [App Provisioning](https://aps.autodesk.com/blog/bim-360-docs-provisioning-forge-apps)
- [Data Management API](https://developer.autodesk.com/en/docs/data/v2/overview/)
- [Revit Cloud Worksharing API](https://aps.autodesk.com/en/docs/data/v2/overview/)

Desktop APIs:

- [Revit](https://knowledge.autodesk.com/support/revit-products/learn-explore/caas/simplecontent/content/my-first-revit-plug-overview.html)

## Tips & Tricks
- Before using the sample to migrate RCW models, you need to setup your Appbundle & Activity of Design Automation, you can simply use the `Configure` button in the Web Application to create the Appbundle & Activity([https://youtu.be/1NCeH7acIko](https://youtu.be/1NCeH7acIko)).
- Make sure the source file is a Revit Cloud Worksharing (RCW) model, not a standard Revit file.
- Ensure you have appropriate permissions in both source and destination BIM 360/ACC projects. 

## Troubleshooting

After installing Github desktop for Windows, on the Git Shell, if you see a ***error setting certificate verify locations*** error, use the following:

    git config --global http.sslverify "false"

## Limitation
- For Demo purpose, we only support **5** files to be migrated as maximum
- Only supports migrating to Revit 2025 or 2026
- Only supports Revit Cloud Worksharing (RCW) models (C4RModel type) - standard Revit files (RVT, RFA, RTE) are not supported
- Override functionality is not fully implemented yet
- Only supports migration between BIM 360/ACC projects
- Migrating linked Revit models is not supported
- Client JavaScript requires modern browser

## License

This sample is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT). Please see the [LICENSE](LICENSE) file for full details.

## Written by

Zhong Wu [@johnonsoftware](https://twitter.com/johnonsoftware), [Autodesk Partner Development](http://aps.autodesk.com)
