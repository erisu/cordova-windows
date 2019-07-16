/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
*/

const fs = require('fs-extra');
const path = require('path');
const uuid = require('node-uuid');
const { CordovaError, events } = require('cordova-common');
const AppxManifest = require('../../template/cordova/lib/AppxManifest');
const pkg = require('../../package');
const ROOT = path.join(__dirname, '..', '..');

// Creates cordova-windows project at specified path with specified namespace, app name and GUID
module.exports.create = function (destinationDir, config, options) {
    if (!destinationDir) return Promise.reject(new CordovaError('No destination directory specified.'));

    const projectPath = path.resolve(destinationDir);
    if (fs.existsSync(projectPath)) {
        return Promise.reject(new CordovaError(`Project directory already exists:\n\t${projectPath}`));
    }

    // Set parameters/defaults for create
    const packageName = (config && config.packageName()) || 'Cordova.Example';
    const appName = (config && config.name()) || 'CordovaAppProj';

    events.emit('log', 'Creating Cordova Windows Project:');
    events.emit('log', `\tPath: ${path.relative(process.cwd(), projectPath)}`);
    events.emit('log', `\tNamespace: ${packageName}`);
    events.emit('log', `\tName: ${appName}`);

    const templateOverrides = options.customTemplate;
    if (templateOverrides) events.emit('log', `\tCustomTemplatePath: ${templateOverrides}`);

    // Make sure that the platform directory is created if missing.
    fs.ensureDirSync(projectPath);

    // Copy the template source files to the new destination
    events.emit('verbose', `Copying windows template project to ${projectPath}`);
    fs.copySync(path.join(ROOT, 'template'), projectPath, { overwrite: false });

    // Duplicate cordova.js to platform_www otherwise it will get removed by prepare
    // Make sure that the platform directory is created if missing.
    const platformWwwDir = path.join(projectPath, 'platform_www');
    fs.ensureDirSync(platformWwwDir);
    fs.copySync(path.join(ROOT, 'template/www/cordova.js'), platformWwwDir, { overwrite: false });

    // Copy cordova-js-src directory
    events.emit('verbose', 'Copying cordova-js sources to platform_www');
    fs.copySync(path.join(ROOT, 'cordova-js-src'), platformWwwDir, { overwrite: false });

    // Duplicate splashscreen.css to platform_www otherwise it will get removed by prepare
    const cssDir = path.join(platformWwwDir, 'css');
    fs.ensureDirSync(cssDir);
    fs.copySync(path.join(ROOT, 'template/www/css/splashscreen.css'), cssDir, { overwrite: false });

    // Copy our unique VERSION file, so peeps can tell what version this project was created from.
    fs.copySync(path.join(ROOT, 'VERSION'), projectPath, { overwrite: false });

    // copy node_modules to cordova directory
    const nodeModulesDir = path.join(ROOT, 'node_modules');
    if (fs.existsSync(nodeModulesDir)) {
        events.emit('verbose', `Copying node_modules to ${projectPath}`);
        fs.copySync(path.join(ROOT, 'node_modules'), path.join(projectPath, 'cordova', 'node_modules'), { overwrite: false });
    }

    // copy check_reqs module to cordova directory
    const cordovaDir = path.join(projectPath, 'cordova');
    fs.copySync(path.join(ROOT, 'bin', 'check_reqs'), cordovaDir, { overwrite: false });
    fs.copySync(path.join(ROOT, 'bin', 'check_reqs.bat'), cordovaDir, { overwrite: false });
    fs.copySync(path.join(ROOT, 'bin', 'lib', 'check_reqs.js'), cordovaDir, { overwrite: false });

    if (templateOverrides && fs.existsSync(templateOverrides)) {
        events.emit('verbose', `Copying windows template overrides from ${templateOverrides} to ${projectPath}`);
        fs.copySync(templateOverrides, projectPath, { overwrite: false });
    }

    // Copy base.js into the target project directory
    const destinationDirectory = path.join(platformWwwDir, 'WinJS', 'js');
    const srcBaseJsPath = require.resolve('winjs/js/base');
    fs.ensureDirSync(destinationDirectory);
    fs.copySync(srcBaseJsPath, destinationDirectory, { overwrite: false });

    // CB-12042 Also copy base.js to www directory
    const wwwWinJSDir = path.join(projectPath, 'www/WinJS/js');
    fs.ensureDirSync(wwwWinJSDir);
    fs.copySync(srcBaseJsPath, wwwWinJSDir, { overwrite: false });

    // 64 symbols restriction goes from manifest schema definition
    // http://msdn.microsoft.com/en-us/library/windows/apps/br211415.aspx
    const safeAppName = appName.length <= 64 ? appName : appName.substr(0, 64);
    const guid = options.guid || uuid.v1();

    // replace specific values in manifests' templates
    events.emit('verbose', 'Updating manifest files with project configuration.');
    [ 'package.windows.appxmanifest', 'package.phone.appxmanifest',
        'package.windows10.appxmanifest' ]
        .forEach(item => {
            const manifest = AppxManifest.get(path.join(projectPath, item));
            if (manifest.hasPhoneIdentity) {
                manifest.getPhoneIdentity().setPhoneProductId(guid);
            }

            manifest.setPackageName(packageName)
                .setAppName(safeAppName)
                .write();
        });

    // Delete bld forder and bin folder
    ['bld', 'bin', '*.user', '*.suo', 'MyTemplate.vstemplate'].forEach(file => {
        fs.removeSync(path.join(projectPath, file));
    });

    events.emit('log', `Windows project created with ${pkg.name}@${pkg.version}`);
    return Promise.resolve();
};
