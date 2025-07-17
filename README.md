# G Finance FAQ Agent Guide

This Genesys Cloud Guide provides an agentic, human-like conversational FAQ experience for G Finance customers. The guide integrates with a knowledge base search function to deliver accurate, grounded responses while maintaining a natural conversation flow. This approach can be used as a reference to create similar FAQ Guides for other industries.

## Overview

The G Finance FAQ Agent is a text-based conversational guide that:

  - Provides customer service for G Finance-related inquiries.
  - Searches a knowledge base to ground all responses in accurate information.
  - Maintains conversation context through summary variables.
  - Delivers responses in a natural, professional tone without revealing internal processes.
  - Handles conversation flow from greeting to closure.

-----

## Key Features

  - **Knowledge Base Integration**: Automatically searches and retrieves relevant information from your knowledge base using a dedicated Genesys Cloud Function.
  - **Advanced Content Parsing**: The function intelligently processes complex KB articles (with lists, tables, etc.) into clean, readable text suitable for AI consumption, that reduces drastically the hallucination likelihood.
  - **Context Awareness**: Uses conversation summaries to maintain a natural dialogue flow.
  - **Hallucination Prevention**: All responses are grounded in actual knowledge base content.
  - **Professional Tone**: Speaks as a knowledgeable G Finance representative.
  - **Conversation Management**: Handles the complete conversation lifecycle with a proper opening and closing.

-----

## Prerequisites

Before setting up this guide, ensure you have:

1.  **Knowledge Base**: A populated Genesys Cloud knowledge base with G Finance articles, with Content Search enabled.
2.  **OAuth Client**: A Genesys Cloud OAuth client with the Client Credentials grant type.
3.  **Required Permissions**: The OAuth client's role must have at least the following permissions:
      * `knowledge:document:search`
      * `knowledge:documentAnswer:view`
      * `knowledge:documentVersion:view`
      * `knowledge:document:view`
      * `knowledge:context:view`
      * `knowledge:category:view`
      * `knowledge:knowledgebase:view`
4.  **Deployed and active: Function Data Actions Integration & Function in that integration**: The "Knowledge Base Search" Genesys Cloud Function Data Actions integration and the Function Action within must be deployed and active/published. First create the integration as described below, enable it, and then create the new action associated to that integration.

-----

## Setup Instructions

### Step 1: Prepare Your Knowledge Base

1.  **Create your knowledge base** with G Finance articles.
      - **CRITICAL**: Enable **"Content Search"** during knowledge base creation.

<img width="684" height="858" alt="image" src="https://github.com/user-attachments/assets/a1a447cb-7c59-49b4-8d56-b5ac8b4f95b8" />


      - Content Search can ONLY be enabled at creation time and cannot be added later.
      - Without Content Search, the FAQ guide's performance will be notably reduced.
      - In case you want to reuse the articles of an existing KB, just export it in JSON format, recreate it (this time enable Content Search), and import the JSON containing the articles.
      
2.  Populate the knowledge base with relevant G Finance articles.
3.  Note the **Knowledge Base ID** (you can find this by exporting the KB to JSON format and grabbing the ID from the beginning of the file).
4.  Test the knowledge base search functionality via the UI to ensure articles are properly indexed.

### Step 2: Configure OAuth Client

Create a Genesys Cloud OAuth client with:

  - **Grant type**: Client Credentials
  - **Role with Required Permissions (see list of permissions above) **
  - Note the **Client ID** and **Client Secret** for the function configuration.

### Step 3: Deploy the Knowledge Base Search Function

#### Function Integration Overview

You have to create a new Function Data Action:

<img width="1921" height="969" alt="image" src="https://github.com/user-attachments/assets/00230ecb-3559-460c-b9e4-b243530a98a6" />




When creating that new integration, navigate to its **Integration -\> Configuration -\> Credentials** tab. You must add the OAuth Client ID and Secret obtained in Step 2, using the exact credential names **`GC_Client_Id`** and **`GC_Client_Secret`**.


<img width="2241" height="1122" alt="image" src="https://github.com/user-attachments/assets/20720071-7bf0-4c7e-94f9-9b56ef362cdd" />



#### Function (Action) Overview

Now you have to create a new action, and associate it to the previous integration:

<img width="1194" height="658" alt="image" src="https://github.com/user-attachments/assets/63da0cff-21a8-4c91-b716-1e7acef383bb" />


This function is the tool that searches the knowledge base and provides clean text to the Guide. Your function name must not contain blank spaces, otherwise the Guide will throw an error. Use "get_KB_matching_articles" as the name. The function calls the `POST /api/v2/knowledge/knowledgebases/{KBId}/documents/search` endpoint. Its primary value is processing the complex nested JSON response from the API to extract readable text from various block types (paragraphs, lists, tables, etc.), making it suitable for a generative AI model.

#### Genesys Cloud Function Configuration

Note: to edit all the sections within the function, make sure to change to JSON mode in each of them:

<img width="2877" height="1006" alt="image" src="https://github.com/user-attachments/assets/1d74e969-c7ea-48b3-9a45-c6872f2607ef" />


**Request Template**

```json
{
  "requestType": "POST",
  "requestTemplate": "{\n  \"query\": \"$esc.jsonEncode(${input.query})\",\n  \"KBId\": \"${input.KBId}\",\n  \"maxArticles\": ${input.maxArticles},\n  \"domain\": \"mypurecloud.de\",\n  \"minConfidence\": ${input.minConfidence}\n}",
  "requestUrlTemplate": "<your-function-id>",
  "headers": {
    "gcClientId": "${credentials.GC_Client_Id}",
    "gcClientSecret": "${credentials.GC_Client_Secret}",
    "domain": "mypurecloud.ie"
  }
}
```

Note: The first time you access to your newly created function, you will see a predefined function id in requestUrlTemplate of Request Template. Copy & paste that same value in the JSON above. Additionally, make sure you correctly set the domain of your GC org (e.g., `mypurecloud.de`, `usw2.pure.cloud`).

**Input Contract**

```json
{
  "title": "Input",
  "type": "object",
  "required": [
    "query",
    "KBId",
    "maxArticles",
    "minConfidence"
  ],
  "additionalProperties": false,
  "properties": {
    "query": {
      "type": "string",
      "description": "Input query to the knowledge base."
    },
    "KBId": {
      "type": "string",
      "description": "The ID of the Knowledge Base to search."
    },
    "maxArticles": {
      "type": "integer",
      "description": "Maximum number of articles to return.",
      "default": 3
    },
    "minConfidence": {
      "type": "number",
      "description": "Minimum confidence threshold for search results (0.0 to 1.0)."
    }
  }
}
```

**Output Contract**

```json
{
  "title": "Output",
  "type": "object",
  "required": [
    "answer"
  ],
  "properties": {
    "answer": {
      "type": "string",
      "description": "The extracted and formatted answer from the knowledge base."
    }
  },
  "additionalProperties": false
}
```

**Response Template**

```json
{
  "translationMap": {},
  "translationMapDefaults": {},
  "successTemplate": "${rawResult}"
}
```

**Function Settings**

  - **Handler:** `src/index.handler`
  - **Runtime:** `nodejs22.x`
  - **Timeout:** 15 seconds
  - Upload the `function.zip` package present in this repo.

### Step 4: Create the Guide

1.  **Create Guide Variables**:

    Navigate to the Guide creation interface and create these variables.

      - **summaryIn**

          - Availability: Input
          - Description: Summary of previous customer conversation, before reaching this workflow. If empty, ignore.
          - Type: string

      - **summaryOut**

          - Availability: Output
          - Description: A compact summary of all the conversation so far.
          - Type: string

      - **KBId**

          - Availability: Input
          - Description: The id of the knowledge base used to ground responses.
          - Type: string

      - **minConfidence**

          - Availability: Input
          - Description: Minimum confidence threshold for an article of the knowledge base to be considered semantically relevant for the customer query.
          - Type: number

      - **maxArticles**

          - Availability: Input
          - Description: The maximum number of knowledge base articles to use for grounding the response.
          - Type: number

Note: 


2.  **Configure the Guide Prompt**:

    Paste the provided guide prompt (FAQ_Guide.md) into the editor. You must then manually replace the placeholder for the function action reference using the `/` menu to select the specific Knowledge Base Search function you activated. When correct, you should see the name of the function action highlighted in violet. Make sure the variables are also correctly interpreted (green highlight).

3.  **Test the Guide**:

    Use the guide testing interface to verify responses are properly grounded and formatted.

### Step 5: Create the Bot Flow

Create a simple digital bot flow (or a bot flow in case you want to test it over voice) with:

1.  **Call Guide** action pointing to your G Finance FAQ Agent Guide.
2.  Set the necessary inputs and outputs (`kb_id`, `kb_confidence_score`, `max_articles`, `domain`, etc.).
3.  **Disconnect** action to end the conversation.

-----

## Guide Variables and Context Management

### Input Variables

  - **summaryIn**: Contains a summary of any previous conversation. This enables the guide to maintain context across multiple guide invocations (in case the architech flow has more than one).
  - **KBId**: The unique identifier of your knowledge base. This allows the same guide to work with different KBs in different environments (dev, test, prod).
  - **minConfidence**: The minimum confidence threshold ($0.0$ to $1.0$) for search results. Higher values return more precise matches.
  - **maxArticles**: The maximum number of articles to retrieve from the knowledge base.

### Output Variables

  - **summaryOut**: A concise summary of the entire conversation that occurred within the guide. This can be used by the parent Architect flow for logging, analytics, or passing context to other actions.

### Context Flow Between Multiple Guides

We could expand the scope of this blueprint to use several guides in the parent architect flow (which is not the current case). In that scenario, you can pass the context across them:

1.  **First Guide** → Outputs `summaryOut`.
2.  **Architect Flow** → Captures the summary and passes it to the next guide.
3.  **Second Guide** → Receives the summary as `summaryIn`.

Example Architect flow structure:
`Start → Call Guide 1 → Store summaryOut → Call Guide 2 (with summaryIn) → End`

-----

## Best Practices

### Knowledge Base Management

  - **Enable Content Search**: Ensure Content Search is enabled during knowledge base creation.
  - Keep articles well-structured and up-to-date.
  - Use clear, customer-friendly language in your articles.

### Confidence Scoring

  - Start with a confidence score of `0.6` or `0.7` for testing.
  - Adjust based on response quality: lower for broader matches, higher for more precise matches (although some meaningful info could be left out if too high).

### Testing

  - Test with various customer queries to ensure proper grounding.
  - Verify that the guide handles "no results" scenarios gracefully.
  - Test context flow between multiple guides if applicable.

-----

## Troubleshooting

### Common Issues

1.  **No Knowledge Base Results**

      - Check that the `KBId` and `domain` are correct.
      - Verify **Content Search** is enabled on the KB (must be set at creation time).
      - Ensure articles are published and searchable.
      - Try lowering the `kb_confidence_score` for testing.

2.  **Function Integration Errors**

      - Verify the OAuth credentials (`GC_Client_Id`, `GC_Client_Secret`) in the function integration are correct.
      - Check that the function's role has the **required knowledge permissions**.
      - Test the function independently via the Developer Tools before integrating it with the guide.
      - Check the content of the "External execution log" section:
  

<img width="1373" height="1065" alt="image" src="https://github.com/user-attachments/assets/19985e3a-88d4-4d05-b829-3677c6e1fc5d" />



3.  **Context Not Flowing**

      - Ensure variable names in the Guide and the Architect flow match exactly.
      - Check that the parent flow is properly passing variables to the "Call Guide" action.
  
4.  **Hallucinated responses**

      - If you have used the same variable and parameter names mentioned in this blueprint, but if you are experienced inconsistent or hallucinated responses that do not match the KB content, it is IMPORTANT that you double check that all the guide input vars that are also in the function input params have the same name and the same type:

<img width="2327" height="959" alt="image" src="https://github.com/user-attachments/assets/43e175da-6923-452d-a6ce-ec90c36627d7" />

## Expected performance - example


### Example G Finance KB article:


<img width="2335" height="1032" alt="image" src="https://github.com/user-attachments/assets/7a807b2a-0439-4abf-a297-126658ea3619" />




### Example response grounded by that article:


<img width="723" height="689" alt="image" src="https://github.com/user-attachments/assets/6e7be485-cf33-46f3-968f-9b1f47a25338" />





