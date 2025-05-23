// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaRuntimeCommandFactory } from '../../lib/utils/lambda-runtimes';

describe('When add lambda runtime command', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    describe('for a python function with commercial region higher than govcloud', () => {
        let lambdaRuntimeCommandFactory: LambdaRuntimeCommandFactory;
        beforeAll(() => {
            lambdaRuntimeCommandFactory = new LambdaRuntimeCommandFactory(
                new cdk.CfnCondition(new cdk.Stack(), 'isGovCloudPartition', {
                    expression: cdk.Fn.conditionEquals(cdk.Aws.PARTITION, 'aws-us-gov')
                })
            );
        });

        it('should execute runtime command for python', () => {
            const command = lambdaRuntimeCommandFactory.getRuntimeCommand(lambda.RuntimeFamily.PYTHON);
            const result = command.getLambdaRuntime();
            expect(result).toContain('Token');
        });
    });

    describe('for a python function with govcloud region same as commercial region', () => {
        let lambdaRuntimeCommandFactory: LambdaRuntimeCommandFactory;

        beforeAll(() => {
            jest.doMock('../../lib/utils/constants', () => ({
                COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME: lambda.Runtime.PYTHON_3_9,
                GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME: lambda.Runtime.PYTHON_3_9
            }));
            const { COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME } = require('../../lib/utils/constants');
            const { LambdaRuntimeCommandFactory } = require('../../lib/utils/lambda-runtimes');

            lambdaRuntimeCommandFactory = new LambdaRuntimeCommandFactory(
                new cdk.CfnCondition(new cdk.Stack(), 'isGovCloudPartition', {
                    expression: cdk.Fn.conditionEquals(cdk.Aws.PARTITION, 'aws-us-gov')
                })
            );

            expect(COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME).toBe(lambda.Runtime.PYTHON_3_9);
        });

        it('should return python 3.9 as a runtime and not a Token', () => {
            const { COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME } = require('../../lib/utils/constants');

            const command = lambdaRuntimeCommandFactory.getRuntimeCommand(lambda.RuntimeFamily.PYTHON);
            const result = command.getLambdaRuntime();
            expect(result).toContain(COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.name);
        });
    });

    describe('for a nodejs function with commercial region higher than govcloud', () => {
        let lambdaRuntimeCommandFactory: LambdaRuntimeCommandFactory;
        beforeAll(() => {
            lambdaRuntimeCommandFactory = new LambdaRuntimeCommandFactory(
                new cdk.CfnCondition(new cdk.Stack(), 'isGovCloudPartition', {
                    expression: cdk.Fn.conditionEquals(cdk.Aws.PARTITION, 'aws-us-gov')
                })
            );
        });

        it('should execute runtime command for nodejs', () => {
            const command = lambdaRuntimeCommandFactory.getRuntimeCommand(lambda.RuntimeFamily.NODEJS);
            const result = command.getLambdaRuntime();
            expect(result).toMatch(/\${Token\[TOKEN.+]}/);
        });
    });

    describe('for a nodejs function with govcloud region same as commercial region', () => {
        let lambdaRuntimeCommandFactory: LambdaRuntimeCommandFactory;

        beforeAll(() => {
            jest.doMock('../../lib/utils/constants', () => ({
                COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME: lambda.Runtime.NODEJS_18_X,
                GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME: lambda.Runtime.NODEJS_18_X
            }));
            const { LambdaRuntimeCommandFactory } = require('../../lib/utils/lambda-runtimes');

            lambdaRuntimeCommandFactory = new LambdaRuntimeCommandFactory(
                new cdk.CfnCondition(new cdk.Stack(), 'isGovCloudPartition', {
                    expression: cdk.Fn.conditionEquals(cdk.Aws.PARTITION, 'aws-us-gov')
                })
            );
        });

        it('should return a Token for nodejs', () => {
            lambdaRuntimeCommandFactory.getRuntimeCommand(lambda.RuntimeFamily.NODEJS);
            const result = lambdaRuntimeCommandFactory
                .getRuntimeCommand(lambda.RuntimeFamily.NODEJS)
                .getLambdaRuntime();
            expect(result).toContain('nodejs18.x');
        });
    });
});
