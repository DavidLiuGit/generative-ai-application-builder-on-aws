// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import path from 'path';
import { BundlerAssetOptions } from '../../../../lib/framework/bundler/base-asset-options';
import { JavascriptLayerAssetOptions } from '../../../../lib/framework/bundler/runtime/javascript-layer';
import { BundlerEnvValues } from './setup';

describe('when bundling JS lambda layer', () => {
    let bundlerAssetOption: BundlerAssetOptions;
    let assetOption: s3_assets.AssetOptions;
    let stack: cdk.Stack;
    const fakeModule = 'fake-module';
    const envValues = new BundlerEnvValues();

    beforeAll(() => {
        envValues.backupEnv();
        envValues.deleteEnvValues();
        stack = new cdk.Stack();
        bundlerAssetOption = new JavascriptLayerAssetOptions();
        assetOption = bundlerAssetOption.options(stack, fakeModule);
    });

    afterAll(() => {
        envValues.restoreEnv();
    });

    it('should have the following commands for docker build', () => {
        expect(JSON.stringify(assetOption.bundling?.command)).toBe(
            JSON.stringify([
                'bash',
                '-c',
                `echo "Executing unit tests" && npm install && npm run test && echo "local bundling failed for ${path.dirname(__dirname).split('/').slice(0, -3).join('/')}/${fakeModule} and hence building with Docker image" && rm -fr /asset-input/node_modules && npm install && rm -fr ./node_modules && npm ci --omit=dev && mkdir -p /asset-output/nodejs/node_modules && cp -au /asset-input/node_modules/* /asset-output/nodejs/node_modules/ && rm -fr /asset-output/.coverage`
            ])
        );
    });

    it('should have the following commands for local build', () => {
        const jsLocalBuild = (bundlerAssetOption as any).localBuild;
        expect(JSON.stringify(jsLocalBuild.bundle(stack, fakeModule, 'fake-output-dir'))).toBe(
            JSON.stringify([
                'echo "Executing unit tests"',
                'cd fake-module',
                'npm install',
                'npm run test',
                'echo local bundling fake-module',
                'cd fake-module',
                'rm -fr node_modules',
                'npm ci --omit=dev',
                'mkdir -p fake-output-dir/nodejs/node_modules',
                'cp -R fake-module/node_modules/* fake-output-dir/nodejs/node_modules/',
                'rm -fr fake-output-dir/.coverage'
            ])
        );
    });
});
