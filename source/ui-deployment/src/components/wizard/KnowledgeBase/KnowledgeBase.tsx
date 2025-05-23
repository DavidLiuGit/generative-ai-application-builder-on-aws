// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
    Box,
    Container,
    Header,
    FormField,
    SpaceBetween,
    RadioGroup,
    RadioGroupProps
} from '@cloudscape-design/components';
import { InfoLink } from '../../commons/common-components';

import AdvancedKnowledgeBaseConfig from './AdvancedKnowledgeBaseConfig';
import { KnowledgeBaseType } from './KnowledgeBaseType';
import KnowledgeBaseSelection from './KnowledgeBaseSelection';
import { StepContentProps } from '../interfaces/Steps';
import { knowledgeBaseInfoPanel } from './helpers';

export const KnowledgeBase = ({ info: { knowledgeBase }, setHelpPanelContent, onChange }: StepContentProps) => {
    const [numFieldsInError, setNumFieldsInError] = React.useState(0);

    const initRagSelectedOption = () => {
        if (knowledgeBase.isRagRequired) {
            return 'true';
        }
        return 'false';
    };

    const [ragSelectedOption, setRagSelectedOption] = React.useState(initRagSelectedOption);
    const [requiredFields, setRequiredFields] = React.useState<any>([]);

    const isRequiredFieldsFilled = () => {
        for (const field of requiredFields) {
            if (knowledgeBase[field].length === 0) {
                return false;
            }
        }
        return true;
    };

    const updateError = () => {
        if (numFieldsInError > 0 || !isRequiredFieldsFilled()) {
            onChange({ inError: true });
        } else if (numFieldsInError === 0 && isRequiredFieldsFilled()) {
            onChange({ inError: false });
        }
    };

    React.useEffect(() => {
        updateError();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        numFieldsInError,
        requiredFields,
        knowledgeBase.kendraIndexName,
        knowledgeBase.kendraIndexId,
        knowledgeBase.kendraAdditionalQueryCapacity,
        knowledgeBase.kendraAdditionalStorageCapacity,
        knowledgeBase.maxNumDocs,
        knowledgeBase.knowledgeBaseType,
        knowledgeBase.bedrockKnowledgeBaseId,
        knowledgeBase.bedrockOverrideSearchType
    ]);

    const handleRagSelection = (detail: RadioGroupProps.ChangeDetail) => {
        setRagSelectedOption(detail.value);
        setRequiredFields([]);
        knowledgeBase.isRagRequired = detail.value === 'true';

        // set error state to false if rag is off
        if (detail.value === 'false') {
            setNumFieldsInError(0);
            onChange({ inError: false });
        }
    };

    return (
        <Box margin={{ bottom: 'l' }} data-testid="rag-required-dropdown">
            <SpaceBetween size="l">
                <Container
                    header={<Header variant="h2">Retrieval Augmented Generation (RAG)</Header>}
                    data-testid="rag-required-container"
                >
                    <SpaceBetween size="l">
                        <FormField
                            label="Do you want to enable Retrieval Augmented Generation (RAG) for this use case?"
                            description="If RAG is enabled, a Knowledge Base (such as one powered by Amazon Kendra) is required to be configured."
                            info={
                                <InfoLink
                                    onFollow={() => setHelpPanelContent(knowledgeBaseInfoPanel.default)}
                                    ariaLabel={'Information about enabling RAG.'}
                                />
                            }
                        >
                            <RadioGroup
                                onChange={({ detail }) => handleRagSelection(detail)}
                                items={[
                                    {
                                        value: 'true',
                                        label: 'Yes'
                                    },
                                    {
                                        value: 'false',
                                        label: 'No'
                                    }
                                ]}
                                value={ragSelectedOption}
                            />
                        </FormField>
                    </SpaceBetween>
                </Container>

                {knowledgeBase.isRagRequired && (
                    <KnowledgeBaseType
                        onChangeFn={onChange}
                        setHelpPanelContent={setHelpPanelContent}
                        knowledgeBaseData={knowledgeBase}
                        setNumFieldsInError={setNumFieldsInError}
                    />
                )}

                {knowledgeBase.isRagRequired && (
                    <KnowledgeBaseSelection
                        onChangeFn={onChange}
                        knowledgeBaseData={knowledgeBase}
                        setHelpPanelContent={setHelpPanelContent}
                        setNumFieldsInError={setNumFieldsInError}
                        setRequiredFields={setRequiredFields}
                    />
                )}

                {knowledgeBase.isRagRequired && (
                    <AdvancedKnowledgeBaseConfig
                        onChangeFn={onChange}
                        setHelpPanelContent={setHelpPanelContent}
                        knowledgeBaseData={knowledgeBase}
                        setNumFieldsInError={setNumFieldsInError}
                    />
                )}
            </SpaceBetween>
        </Box>
    );
};
export default KnowledgeBase;
