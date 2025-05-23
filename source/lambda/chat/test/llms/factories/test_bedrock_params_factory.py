#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from llms.factories.bedrock_adapter_factory import BedrockAdapterFactory
from llms.models.bedrock_params.ai21 import BedrockAI21LLMParams
from llms.models.bedrock_params.amazon import BedrockAmazonLLMParams
from llms.models.bedrock_params.anthropic import BedrockAnthropicV1LLMParams, BedrockAnthropicV3LLMParams
from llms.models.bedrock_params.cohere import BedrockCohereTextLLMParams
from llms.models.bedrock_params.meta import BedrockMetaLLMParams
from utils.enum_types import BedrockModelProviders


@pytest.mark.parametrize(
    "model_family, model_id, expected_adapter",
    [
        (BedrockModelProviders.ANTHROPIC.value, "anthropic.claude-v2", BedrockAnthropicV1LLMParams),
        (BedrockModelProviders.ANTHROPIC.value, "anthropic.claude-3-haiku-20240307-v1:0", BedrockAnthropicV3LLMParams),
        (BedrockModelProviders.AMAZON.value, "amazon.titan-text-lite-v1", BedrockAmazonLLMParams),
        (BedrockModelProviders.AI21.value, "ai21.j2-mid-v1", BedrockAI21LLMParams),
        (BedrockModelProviders.COHERE.value, "cohere.command-text-v14", BedrockCohereTextLLMParams),
        (BedrockModelProviders.META.value, "meta.llama3-70b-instruct-v1", BedrockMetaLLMParams),
    ],
)
def test_sanitizer_passes(model_family, model_id, expected_adapter):
    bedrock_adapter = BedrockAdapterFactory().get_bedrock_adapter(model_family, model_id)
    assert bedrock_adapter == expected_adapter


def test_sanitizer_fails():
    with pytest.raises(ValueError) as error:
        BedrockAdapterFactory().get_bedrock_adapter("Ai21", "fake-model")

    assert error.value.args[0] == "BedrockAdapterFactory: Provided model family is not supported."
