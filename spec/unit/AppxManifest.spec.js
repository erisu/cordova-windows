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

var rewire = require('rewire');
var et = require('elementtree');
var xml = require('cordova-common').xmlHelpers;
var AppxManifest = rewire('../../template/cordova/lib/AppxManifest');
var refineColor = AppxManifest.__get__('refineColor');

var WINDOWS_10_MANIFEST = 'template/package.windows10.appxmanifest';
var CSS_COLOR_NAME = 'turquoise';

describe('AppxManifest', function () {

    var XMLS = {
        '/no/prefixed': new et.ElementTree(et.XML('<?xml version="1.0" encoding="UTF-8"?><Package/>')),
        '/uap/prefixed': new et.ElementTree(et.XML('<?xml version="1.0" encoding="UTF-8"?><Package xmlns:uap=""/>'))
    };

    beforeEach(function () {
        var parseElementtreeSyncOrig = xml.parseElementtreeSync;
        spyOn(xml, 'parseElementtreeSync').and.callFake(function (manifestPath) {
            return XMLS[manifestPath] || parseElementtreeSyncOrig(manifestPath);
        });

        AppxManifest.__set__('manifestCache', {});
    });

    describe('constructor', function () {

        it('Test #000 : should create a new AppxManifest instance', function () {
            var manifest;
            expect(function () { manifest = new AppxManifest(WINDOWS_10_MANIFEST); }).not.toThrow();
            expect(manifest instanceof AppxManifest).toBe(true);
        });

        it('Test #001 : should throw if first parameter is not a file', function () {
            expect(function () { new AppxManifest('/invalid/path'); }).toThrow(); /* eslint no-new : 0 */
        });

        it('Test #002 : should throw if first parameter is not a valid manifest file (no "Package" tag)', function () {
            expect(function () { new AppxManifest('/invalid/manifest'); }).toThrow(); /* eslint no-new : 0 */
        });
    });

    describe('purgeCache method', function () {
        beforeEach(function () {
            AppxManifest.__set__('manifestCache', { a: 'foo/a', b: 'foo/b', c: 'foo/c' });
        });

        it('Test #004 : should remove all entries when no parameter is specified', function () {
            AppxManifest.purgeCache();
            var cache = AppxManifest.__get__('manifestCache');
            expect(Object.keys(cache).length).toBe(0);
        });

        it('Test #005 : should remove an entry when parameter is a string key', function () {
            AppxManifest.purgeCache('a');
            var cache = AppxManifest.__get__('manifestCache');
            expect(Object.keys(cache).length).toBe(2);
            expect(cache.a).not.toBeDefined();
        });

        it('Test #006 : should remove multiple entries when parameter is an array of keys', function () {
            AppxManifest.purgeCache(['a', 'b']);
            var cache = AppxManifest.__get__('manifestCache');
            expect(Object.keys(cache).length).toBe(1);
            expect(cache.a).not.toBeDefined();
            expect(cache.b).not.toBeDefined();
        });

        it('Test #007 : should not remove anything if there is no such key', function () {
            AppxManifest.purgeCache(['bar']);
            var cache = AppxManifest.__get__('manifestCache');
            expect(Object.keys(cache).length).toBe(3);
            expect(cache.a).toBeDefined();
            expect(cache.b).toBeDefined();
            expect(cache.c).toBeDefined();
        });
    });

    describe('static get() method', function () {
        it('Test #008 : should return an AppxManifest instance', function () {
            expect(AppxManifest.get(WINDOWS_10_MANIFEST) instanceof AppxManifest).toBe(true);
        });

        it('Test #011 : should throw error when a non Windows 10 AppxManifest is provided.', function () {
            expect(() => {
                AppxManifest.get('/no/prefixed');
            }).toThrowError(/Only Windows 10 is Supported./);
        });

        it('Test #011 : should cache AppxManifest instances by default', function () {
            var manifest = AppxManifest.get('/uap/prefixed');
            expect(xml.parseElementtreeSync.calls.count()).toBe(2);

            var manifest2 = AppxManifest.get('/uap/prefixed');
            expect(xml.parseElementtreeSync.calls.count()).toBe(2);

            expect(manifest).toBe(manifest2);
        });

        it('Test #012 : should not use cache to get AppxManifest instances when "ignoreCache" is specified', function () {
            var manifest = AppxManifest.get('/uap/prefixed');
            expect(xml.parseElementtreeSync.calls.count()).toBe(2);

            var manifest2 = AppxManifest.get('/uap/prefixed', true);
            expect(xml.parseElementtreeSync.calls.count()).toBe(4);

            expect(manifest).not.toBe(manifest2);
        });

        it('Test #013 : should not cache AppxManifest instances when "ignoreCache" is specified', function () {
            var manifest = AppxManifest.get('/uap/prefixed', true);
            expect(xml.parseElementtreeSync.calls.count()).toBe(2);

            var manifest2 = AppxManifest.get('/uap/prefixed');
            expect(xml.parseElementtreeSync.calls.count()).toBe(4);

            expect(manifest).not.toBe(manifest2);
        });
    });

    describe('instance get* methods', function () {
        var methods = ['getPhoneIdentity', 'getIdentity', 'getProperties', 'getApplication', 'getVisualElements'];

        it('Test #014 : should exists', function () {
            var manifest = AppxManifest.get(WINDOWS_10_MANIFEST);

            methods.forEach(function (method) {
                expect(manifest[method]).toBeDefined();
                expect(manifest[method]).toEqual(jasmine.any(Function));
                expect(function () { manifest[method](); }).not.toThrow();
                expect(manifest[method]()).toBeDefined();
            });
        });
    });

    describe('instance write method', function () {
        it('Test #015 : should not write duplicate UAP capability declarations', function () {
            var manifest = AppxManifest.get(WINDOWS_10_MANIFEST);
            var capabilities = manifest.doc.find('.//Capabilities');
            capabilities.append(new et.Element('uap:Capability', { 'Name': 'enterpriseAuthentication' }));
            capabilities.append(new et.Element('uap:Capability', { 'Name': 'enterpriseAuthentication' }));

            var xml = manifest.writeToString();

            expect((xml.match(/enterpriseAuthentication/g) || []).length).toBe(1);
        });
    });

    describe('getVisualElements methods', function () {
        it('Test #016 : refineColor should leave CSS color name as is', function () {
            expect(refineColor(CSS_COLOR_NAME)).toEqual(CSS_COLOR_NAME);
        });

        it('Test #017 : setForegroundText do nothing on non-Windows 10 platforms', function () {
            var visualElementsWindows10 = AppxManifest.get(WINDOWS_10_MANIFEST).getVisualElements();

            var foregroundTextLight = 'light';

            // Returns nothing on Windows 10
            visualElementsWindows10.setForegroundText(foregroundTextLight);
            expect(visualElementsWindows10.getForegroundText()).toEqual(undefined);
        });

        it('Test #018 : getSplashScreenExtension/setSplashScreenExtension', function () {
            var visualElementsWindows10 = AppxManifest.get(WINDOWS_10_MANIFEST).getVisualElements();
            var jpgExtension = '.jpg';

            // PNG is default extension
            expect(visualElementsWindows10.getSplashScreenExtension()).toEqual('.png');

            // Set to jpg
            visualElementsWindows10.setSplashScreenExtension(jpgExtension);
            expect(visualElementsWindows10.getSplashScreenExtension()).toEqual(jpgExtension);
        });
    });
});
