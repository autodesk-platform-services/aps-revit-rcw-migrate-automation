// (C) Copyright 2011 by Autodesk, Inc. 
//
// Permission to use, copy, modify, and distribute this software
// in object code form for any purpose and without fee is hereby
// granted, provided that the above copyright notice appears in
// all copies and that both that copyright notice and the limited
// warranty and restricted rights notice below appear in all
// supporting documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS. 
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK,
// INC. DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL
// BE UNINTERRUPTED OR ERROR FREE.
//
// Use, duplication, or disclosure by the U.S. Government is
// subject to restrictions set forth in FAR 52.227-19 (Commercial
// Computer Software - Restricted Rights) and DFAR 252.227-7013(c)
// (1)(ii)(Rights in Technical Data and Computer Software), as
// applicable.
//

using System;
using System.IO;
using System.Linq;
using Autodesk.Revit.DB;
using Autodesk.Revit.ApplicationServices;

using DesignAutomationFramework;
using Newtonsoft.Json;

namespace APS.Revit.RCWMigrator
{

    [Autodesk.Revit.Attributes.Regeneration(Autodesk.Revit.Attributes.RegenerationOption.Manual)]
    [Autodesk.Revit.Attributes.Transaction(Autodesk.Revit.Attributes.TransactionMode.Manual)]
    public class RCWMigratorApp : IExternalDBApplication
    {
        public ExternalDBApplicationResult OnStartup(ControlledApplication application)
        {
            DesignAutomationBridge.DesignAutomationReadyEvent += HandleDesignAutomationReadyEvent;
            return ExternalDBApplicationResult.Succeeded;
        }

        public void HandleDesignAutomationReadyEvent( object sender, DesignAutomationReadyEventArgs e)
        {
            e.Succeeded = true;
            MigrateRCW(e.DesignAutomationData);
        }

        protected void MigrateRCW( DesignAutomationData data )
        {
            if (data == null)
                throw new ArgumentNullException(nameof(data));

            Application rvtApp = data.RevitApp;
            if (rvtApp == null)
                throw new InvalidDataException(nameof(rvtApp));

            InputParams inputParams = InputParams.Parse("params.json");
            if (inputParams == null)
                throw new InvalidDataException("Cannot parse out input parameters correctly.");

            Console.WriteLine("Got the input json file sucessfully.");
            var cloudModelPath = ModelPathUtils.ConvertCloudGUIDsToCloudPath(ModelPathUtils.CloudRegionUS, inputParams.ProjectGuid, inputParams.ModelGuid);
            Console.WriteLine("Revit starts openning Revit Cloud Model");

            Document doc = rvtApp.OpenDocumentFile(cloudModelPath, new OpenOptions());
            if (doc == null)
                throw new InvalidOperationException("Could not open Revit Cloud Model.");

            Console.WriteLine("Revit Cloud Model is opened");
            try
            {
                // Reminder: the API does not support if the current model is already a Revit Cloud Model, discussing with Revit team for improvement.
                doc.SaveAsCloudModel(inputParams.TargetAccountGuid, inputParams.TargetProjectGuid, inputParams.TargetFolderUrn, inputParams.TargetModelName);
            }
            catch(Exception ex)
            {
                Console.WriteLine("Failed to save cloud model due to: "+ ex.Message);
            }
        }


        public ExternalDBApplicationResult OnShutdown(ControlledApplication application)
        {

            return ExternalDBApplicationResult.Succeeded;
        }

        /// <summary>
        /// InputParams is used to parse the input Json parameters
        /// </summary>
        internal class InputParams
        {
            // source revit cloud model
            public string Region { get; set; } = ModelPathUtils.CloudRegionUS;
            [JsonProperty(PropertyName = "projectGuid", Required = Required.Default)]
            public Guid ProjectGuid { get; set; }
            [JsonProperty(PropertyName = "modelGuid", Required = Required.Default)]
            public Guid ModelGuid { get; set; }

            // target location of revit cloud model
            [JsonProperty(PropertyName = "TargetAccountGuid", Required = Required.Default)]
            public Guid TargetAccountGuid { get; set; }
            [JsonProperty(PropertyName = "TargetProjectGuid", Required = Required.Default)]
            public Guid TargetProjectGuid { get; set; }
            [JsonProperty(PropertyName = "TargetFolderUrn", Required = Required.Default)]
            public string TargetFolderUrn { get; set; }
            [JsonProperty(PropertyName = "TargetModelName", Required = Required.Default)]
            public string TargetModelName { get; set; }

            static public InputParams Parse(string jsonPath)
            {
                try
                {
                    if (!File.Exists(jsonPath))
                        return new InputParams { Region = ModelPathUtils.CloudRegionUS, ProjectGuid = new Guid(""), ModelGuid = new Guid(""), 
                            TargetAccountGuid = new Guid(""), TargetProjectGuid = new Guid(""), TargetFolderUrn = "", TargetModelName = "" };

                    string jsonContents = File.ReadAllText(jsonPath);
                    return JsonConvert.DeserializeObject<InputParams>(jsonContents);
                }
                catch (System.Exception ex)
                {
                    Console.WriteLine("Exception when parsing json file: " + ex);
                    return null;
                }
            }
        }

    };

}
