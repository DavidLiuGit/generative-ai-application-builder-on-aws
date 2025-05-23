// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import {
    mockValidWebsocketRequestEvent,
    mockInvalidRequestEvent,
    mockValidRestRequestEvent,
    batchGetItemResponse,
    fakeIdToken
} from './event-test-data';
import { DynamoDBDocumentClient, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { handler as websocketHandler } from '../websocket-authorizer';
import { handler as restHandler } from '../rest-authorizer';
import { mockClient } from 'aws-sdk-client-mock';

jest.mock('aws-jwt-verify', () => {
    return {
        CognitoJwtVerifier: {
            create: () => {
                return {
                    verify: () => {
                        return fakeIdToken;
                    }
                };
            }
        }
    };
});

describe('When the websocket handler receives an authorization event', () => {
    let ddbMockedClient: any;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0084/v2.1.0" }`;
        process.env.COGNITO_POLICY_TABLE_NAME = 'fake-table-name';
        ddbMockedClient = mockClient(DynamoDBDocumentClient);
    });

    it('should return an allow policy', async () => {
        ddbMockedClient.on(BatchGetCommand).resolves(batchGetItemResponse);
        const response = await websocketHandler(mockValidWebsocketRequestEvent as APIGatewayRequestAuthorizerEvent);
        expect(response).toEqual({
            principalId: '*',
            policyDocument: {
                'Version': '2012-10-17',
                'Statement': [
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'use-case-management-api-admin-policy-statement'
                    },
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id2/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'BedrockChatStack-Users-policy-statement'
                    }
                ]
            },
            context: {
                UserId: 'fake-sub'
            }
        });
    });

    it('should return a deny policy due to jwt verification failure', async () => {
        jest.unmock('aws-jwt-verify');

        jest.mock('aws-jwt-verify', () => {
            return {
                CognitoJwtVerifier: {
                    create: () => {
                        return {
                            verify: () => {
                                throw new Error('Mock-jwt-error');
                            }
                        };
                    }
                }
            };
        });

        try {
            await websocketHandler(mockValidWebsocketRequestEvent as APIGatewayRequestAuthorizerEvent);
        } catch (error: any) {
            expect(error.message).toEqual('Unauthorized');
        }
    });

    it('should return a deny policy when event payload is bad', async () => {
        try {
            await websocketHandler(mockInvalidRequestEvent as APIGatewayRequestAuthorizerEvent);
        } catch (error: any) {
            expect(error.message).toEqual('Unauthorized');
        }
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.COGNITO_POLICY_TABLE_NAME;

        ddbMockedClient.restore();
    });

    afterEach(() => jest.clearAllMocks());
});

describe('When the rest handler receives an authorization event', () => {
    let ddbMockedClient: any;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0084/v2.1.0" }`;
        process.env.COGNITO_POLICY_TABLE_NAME = 'fake-table-name';
        ddbMockedClient = mockClient(DynamoDBDocumentClient);
    });

    it('should return an allow policy', async () => {
        ddbMockedClient.on(BatchGetCommand).resolves(batchGetItemResponse);
        const response = await restHandler(mockValidRestRequestEvent as APIGatewayRequestAuthorizerEvent);
        expect(response).toEqual({
            principalId: '*',
            policyDocument: {
                'Version': '2012-10-17',
                'Statement': [
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'use-case-management-api-admin-policy-statement'
                    },
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id2/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'BedrockChatStack-Users-policy-statement'
                    }
                ]
            },
            context: {
                UserId: 'fake-sub'
            }
        });
    });

    it('should return a deny policy when verification fails', async () => {
        jest.unmock('aws-jwt-verify');

        jest.mock('aws-jwt-verify', () => {
            return {
                CognitoJwtVerifier: {
                    create: () => {
                        return {
                            verify: () => {
                                throw new Error('Mock-jwt-error');
                            }
                        };
                    }
                }
            };
        });

        try {
            await restHandler(mockValidRestRequestEvent as APIGatewayRequestAuthorizerEvent);
        } catch (error: any) {
            expect(error.message).toEqual('Unauthorized');
        }
    });

    it('should return a deny policy when event payload is bad', async () => {
        try {
            await restHandler(mockInvalidRequestEvent as APIGatewayRequestAuthorizerEvent);
        } catch (error: any) {
            expect(error.message).toEqual('Unauthorized');
        }
    });

    afterEach(() => jest.clearAllMocks());
    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.COGNITO_POLICY_TABLE_NAME;

        ddbMockedClient.restore();
    });
});

jest.clearAllMocks();
