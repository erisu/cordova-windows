/**
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

const path = require('path');
const ConfigParser = require('../../../template/cordova/lib/config/WindowsConfigParser');
const xml = path.join(__dirname, '../fixtures/test-config.xml');
const rewire = require('rewire');
const AppxManifest = require('../../../template/cordova/lib/AppxManifest');

describe('WindowsConfigParser', () => {
    let config;

    beforeEach(() => {
        config = new ConfigParser(xml);
    });

    describe('getStaticResources method', () => {
        let hasPlatformPropertyDefined = function (e) { return !!e.platform; };
        let hasSrcPropertyDefined = function (e) { return !!e.src; };
        let hasTargetPropertyDefined = function (e) { return !!e.target; };

        it('should parse resources\' attributes', () => {
            expect(config.getStaticResources('icon').every(hasSrcPropertyDefined)).toBeTruthy();
            expect(config.getStaticResources('icon').filter(hasPlatformPropertyDefined).every(hasTargetPropertyDefined)).toBeTruthy();
        });

        it('should have getDefault method returning defaultResource property', () => {
            expect(config.getStaticResources('icon').getDefault()).toEqual(config.getStaticResources('icon').getDefault());
        });

        it('should have getBySize method returning resource with size specified or null', () => {
            expect(config.getStaticResources('icon').getBySize(128)).toBe(null);
            expect(config.getStaticResources('icon').getBySize(72)).toBeDefined();
            expect(config.getStaticResources('icon').getBySize(72).width).toBe(72);
            expect(config.getStaticResources('icon').getBySize(null, 48)).toBeDefined();
            expect(config.getStaticResources('icon').getBySize(null, 48).height).toBe(48);
        });
    });

    describe('getFileResources method', () => {
        const hasArchPropertyDefined = e => !!e.arch;

        it('should parse resources\' attributes', () => {
            expect(config.getFileResources('windows').every(hasArchPropertyDefined)).toBeTruthy();
        });
    });

    describe('getAllMinMaxUAPVersions method', () => {
        it('should correctly transform all versions as a baseline.', () => {
            spyOn(config, 'getMatchingPreferences').and.returnValue([
                { name: 'Windows.Universal-MinVersion', value: '10.0.9910.0' },
                { name: 'Windows.Universal-MaxVersionTested', value: '10.0.9917.0' },
                { name: 'Windows.Desktop-MinVersion', value: '10.0.9910.0' },
                { name: 'Microsoft.Xbox-MaxVersionTested', value: '10.0.9917.0' }
            ]);

            const versionSet = config.getAllMinMaxUAPVersions();
            const ver9910 = '10.0.9910.0';
            const ver9917 = '10.0.9917.0';

            expect(versionSet.length).toBe(3);

            expect(versionSet[0].Name).toBe('Windows.Universal');
            expect(versionSet[0].MinVersion).toBe(ver9910);
            expect(versionSet[0].MaxVersionTested).toBe(ver9917);

            expect(versionSet[1].Name).toBe('Windows.Desktop');
            expect(versionSet[1].MinVersion).toBe(ver9910);
            expect(versionSet[1].MaxVersionTested).toBe(ver9910);

            expect(versionSet[2].Name).toBe('Microsoft.Xbox');
            expect(versionSet[2].MinVersion).toBe(ver9917);
            expect(versionSet[2].MaxVersionTested).toBe(ver9917);
        });

        it('should produce versions correctly even when the config file has no settings.', () => {
            spyOn(config, 'getMatchingPreferences').and.returnValue([]);

            const versionSet = config.getAllMinMaxUAPVersions();
            const verBaseline = rewire('../../../template/cordova/lib/config/WindowsConfigParser')
                .__get__('BASE_UAP_VERSION').toString();

            expect(versionSet.length).toBe(1);
            expect(versionSet[0].Name).toBe('Windows.Universal');
            expect(versionSet[0].MinVersion).toBe(verBaseline);
            expect(versionSet[0].MaxVersionTested).toBe(verBaseline);

        });

        it('should fail with a RangeError if version specified incorrectly', () => {
            spyOn(config, 'getMatchingPreferences')
                .and.returnValue([
                    { name: 'Windows.Universal-MinVersion', value: '10.0.9910.f' },
                    { name: 'Windows.Universal-MaxVersionTested', value: '10.0.9917.0' }
                ]);

            try {
                config.getAllMinMaxUAPVersions();
                expect(false).toBe(true);
            } catch (ex) {
                expect(ex.constructor).toBe(RangeError);
            }
        });
    });

    describe('getConfigFiles method', () => {
        it('should call AppxManifest.processChanges to distribute changes across manifests', () => {
            spyOn(AppxManifest, 'processChanges').and.callThrough();
            config.getConfigFiles('windows');
            expect(AppxManifest.processChanges).toHaveBeenCalled();
        });
    });
});
