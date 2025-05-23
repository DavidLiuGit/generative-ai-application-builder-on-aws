#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as kms from 'aws-cdk-lib/aws-kms';

import { Construct, IConstruct } from 'constructs';

import { NagSuppressions } from 'cdk-nag';
import { BaseUseCaseNestedStack } from '../framework/base-nested-stack';
import {
    DEFAULT_KENDRA_EDITION,
    DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
    DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
    DEFAULT_NEW_KENDRA_INDEX_NAME,
    KENDRA_EDITIONS,
    MAX_KENDRA_QUERY_CAPACITY_UNITS,
    MAX_KENDRA_STORAGE_CAPACITY_UNITS
} from '../utils/constants';

export class KendraKnowledgeBaseParameters {
    /**
     * Name of the new Kendra index to be created. Will have useCaseUUID appended.
     */
    public readonly kendraIndexName: string;

    /**
     * The amount of extra query capacity for an index and [GetQuerySuggestions](https://docs.aws.amazon.com/kendra/latest/dg/API_GetQuerySuggestions.html) capacity.
     * A single extra capacity unit for an index provides 0.1 queries per second or approximately 8,000 queries per day.
     *
     * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-kendra-index-capacityunitsconfiguration.html#cfn-kendra-index-capacityunitsconfiguration-querycapacityunits
     */
    public readonly queryCapacityUnits?: number;

    /**
     * The amount of extra storage capacity for an index. A single capacity unit provides 30 GB of storage space or 100,000 documents, whichever is reached first.
     *
     * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-kendra-index-capacityunitsconfiguration.html#cfn-kendra-index-capacityunitsconfiguration-storagecapacityunits
     */
    public readonly storageCapacityUnits?: number;

    /**
     * The Kendra edition subscription. Choice between 'DEVELOPER' and 'ENTERPRISE'
     */
    public readonly kendraIndexEdition: string;

    constructor(stack: IConstruct) {
        this.kendraIndexName = new cdk.CfnParameter(stack, 'KendraIndexName', {
            type: 'String',
            default: DEFAULT_NEW_KENDRA_INDEX_NAME,
            maxLength: 64,
            allowedPattern: '^[0-9a-zA-Z-]{1,64}$',
            description: 'Name of the new Kendra index to be created. Will have useCaseUUID appended'
        }).valueAsString;

        this.queryCapacityUnits = new cdk.CfnParameter(stack, 'QueryCapacityUnits', {
            type: 'Number',
            description:
                'The amount of extra query capacity for an index and [GetQuerySuggestions](https://docs.aws.amazon.com/kendra/latest/dg/API_GetQuerySuggestions.html) capacity.' +
                'A single extra capacity unit for an index provides 0.1 queries per second or approximately 8,000 queries per day.',
            default: DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
            minValue: 0,
            maxValue: MAX_KENDRA_QUERY_CAPACITY_UNITS
        }).valueAsNumber;

        this.storageCapacityUnits = new cdk.CfnParameter(stack, 'StorageCapacityUnits', {
            type: 'Number',
            description:
                'The amount of extra storage capacity for an index. A single capacity unit provides 30 GB of storage space or 100,000 documents, whichever is reached first.',
            default: DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
            minValue: 0,
            maxValue: MAX_KENDRA_STORAGE_CAPACITY_UNITS
        }).valueAsNumber;

        this.kendraIndexEdition = new cdk.CfnParameter(stack, 'KendraIndexEdition', {
            type: 'String',
            allowedValues: KENDRA_EDITIONS,
            default: DEFAULT_KENDRA_EDITION,
            description: 'Indicates whether the index is a Enterprise Edition index or a Developer Edition index',
            constraintDescription: 'You can only choose between "DEVELOPER_EDITION" OR "ENTERPRISE_EDITION"'
        }).valueAsString;
    }
}

export class KendraKnowledgeBase extends BaseUseCaseNestedStack {
    /**
     * KMS managed key for accessing kendra
     */
    public readonly kendraKMSKey: kms.Key;

    /**
     * The Amazon Kendra index for searching.
     */
    public readonly kendraKnowledgeBaseIndex: kendra.CfnIndex;

    /**
     * An IAM role that can be assumed in order to access the Kendra service
     */
    public readonly kendraKnowledgeBaseRole: iam.Role;

    /**
     * Amazon Kendra role arn that can be assumed in order to access the Kendra service
     */
    public readonly kendraRoleArn: string;

    constructor(scope: Construct, id: string, props: cdk.NestedStackProps) {
        super(scope, id, props);
        const stackParameters = new KendraKnowledgeBaseParameters(cdk.Stack.of(this));

        this.kendraKnowledgeBaseRole = this.createKendraIAMRole();
        this.kendraRoleArn = this.kendraKnowledgeBaseRole.roleArn;

        this.kendraKMSKey = new kms.Key(this, 'KendraIndexEncryptionKey', {
            enableKeyRotation: true
        });
        this.kendraKMSKey.grantEncryptDecrypt(this.kendraKnowledgeBaseRole);

        this.kendraKnowledgeBaseIndex = this.createKendraIndex(stackParameters);

        // cfnag suppressions
        NagSuppressions.addResourceSuppressions(
            this.kendraKnowledgeBaseRole.node.tryFindChild('DefaultPolicy') as iam.CfnPolicy,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Kendra needs this permission to allow logging',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:/aws/kendra/*',
                        'Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:/aws/kendra/*:log-stream:*'
                    ]
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Kendra needs the ability to generate keys and re-encrypt. This is granted by kendraKMSKey.grantEncryptDecrypt',
                    appliesTo: ['Action::kms:GenerateDataKey*', 'Action::kms:ReEncrypt*']
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'This permission is required for logs:DescribeLogGroups and cloudwatch:PutMetricData as per https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html ',
                    appliesTo: ['Action::cloudwatch:PutMetricData', 'Action::logs:DescribeLogGroups', 'Resource::*']
                }
            ]
        );
    }

    /**
     * Handles creation of Kendra index with given properties
     *
     * @param props properties as passed from constructor
     * @returns CfnIndex, the created Kendra index
     */
    private createKendraIndex(props: KendraKnowledgeBaseParameters) {
        const kendraProps = {
            capacityUnits: {
                queryCapacityUnits: props.queryCapacityUnits ?? 0,
                storageCapacityUnits: props.storageCapacityUnits ?? 0
            },
            description: `Kendra index which provides a knowledge base for the Chat use case.`,
            edition: props.kendraIndexEdition,
            name: `${props.kendraIndexName}-${this.useCaseUUID}`,
            roleArn: this.kendraKnowledgeBaseRole.roleArn,
            serverSideEncryptionConfiguration: {
                kmsKeyId: this.kendraKMSKey.keyId
            }
        } as kendra.CfnIndexProps;

        // we do not want the Kendra index being deleted when a use case is deleted or updated to a new index.
        const kendraKnowledgeBaseIndex = new kendra.CfnIndex(this, 'KendraKnowledgeBase', kendraProps);
        kendraKnowledgeBaseIndex.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
        return kendraKnowledgeBaseIndex;
    }

    /**
     * Creates an IAM role which will be assigned to the Kendra index, allowing it to perform logging functions
     *
     * @returns the IAM role
     */
    private createKendraIAMRole(): iam.Role {
        const kendraRole = new iam.Role(this, 'KendraRole', {
            assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com')
        });

        kendraRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['cloudwatch:PutMetricData'],
                resources: ['*'],
                conditions: { StringEquals: { 'cloudwatch:namespace': 'AWS/Kendra' } }
            })
        );

        kendraRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['logs:DescribeLogGroups'],
                resources: ['*']
            })
        );

        kendraRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['logs:CreateLogGroup'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/kendra/*`
                ]
            })
        );

        kendraRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['logs:DescribeLogStreams', 'logs:CreateLogStream', 'logs:PutLogEvents'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/kendra/*:log-stream:*`
                ]
            })
        );

        const kendraPolicy = kendraRole.node.tryFindChild('DefaultPolicy') as iam.Policy;

        // since the Kendra index is retained, the role and policy are as well
        kendraRole.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
        kendraPolicy.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

        return kendraRole;
    }
}
