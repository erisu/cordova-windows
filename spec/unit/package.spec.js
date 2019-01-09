/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    'License'); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/
const path = require('path');
const rewire = require('rewire');
const fs = require('fs-extra');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'template');
const pkg = rewire(path.join(TEMPLATE_DIR, 'cordova/lib/package.js'));
const tempProject = path.join(TEMPLATE_DIR, 'AppPackages');
const dummyProjectAppPackage = path.join(ROOT_DIR, 'spec', 'unit', 'fixtures', 'DummyProject', 'AppPackages');

beforeEach(() => {
    fs.copySync(dummyProjectAppPackage, tempProject);
});

afterEach(() => {
    fs.removeSync(tempProject);
});

describe('getPackage method', () => {
    it('should find windows10 anycpu debug package', () => {
        var rejected = jasmine.createSpy();

        return pkg.getPackage('debug', 'anycpu')
            .then((pkgInfo) => {
                expect(pkgInfo.type).toBe('windows10');
                expect(pkgInfo.buildtype).toBe('debug');
                expect(pkgInfo.arch).toBe('anycpu');
                expect(pkgInfo.script).toBeDefined();
            }, (err) => {
                rejected(err);
            })
            .finally(() => {
                expect(rejected).not.toHaveBeenCalled();
            });
    });
});

describe('getPackageFileInfo method', () => {
    it('should get file info correctly for windows10 anycpu debug package', () => {
        var packageFile = path.join(tempProject, 'CordovaApp.Windows10_0.0.1.0_anycpu_debug_Test', 'CordovaApp.Windows10_0.0.1.0_anycpu_debug.appx');
        var pkgInfo = pkg.getPackageFileInfo(packageFile);

        expect(pkgInfo.type).toBe('windows10');
        expect(pkgInfo.arch).toBe('anycpu');
        expect(pkgInfo.buildtype).toBe('debug');
    });

    it('should get file info correctly for windows10 x64 release package', () => {
        var packageFile = path.join(tempProject, 'CordovaApp.Windows10_0.0.1.0_x64_Test', 'CordovaApp.Windows10_0.0.1.0_x64.appx');
        var pkgInfo = pkg.getPackageFileInfo(packageFile);

        expect(pkgInfo.type).toBe('windows10');
        expect(pkgInfo.arch).toBe('x64');
        expect(pkgInfo.buildtype).toBe('release');
    });

    it('spec.9 should get file info correctly for windows10 x86 release package', () => {
        var packageFile = path.join(tempProject, 'CordovaApp.Windows10_0.0.1.0_x86_Test', 'CordovaApp.Windows10_0.0.1.0_x86.appx');
        var pkgInfo = pkg.getPackageFileInfo(packageFile);

        expect(pkgInfo.type).toBe('windows10');
        expect(pkgInfo.arch).toBe('x86');
        expect(pkgInfo.buildtype).toBe('release');
    });
});

describe('getAppId method', () => {
    it('should properly get phoneProductId value from manifest', () => {
        return pkg.getAppId(TEMPLATE_DIR).then((appId) => {
            expect(appId).toBe('$guid1$');
        });
    });
});

describe('getPackageName method', () => {
    it('should properly get Application Id value from manifest', () => {
        const getPackageName = pkg.__get__('getPackageName');

        return getPackageName(TEMPLATE_DIR).then((appId) => {
            expect(appId).toBe('$guid1$');
        });
    });
});
