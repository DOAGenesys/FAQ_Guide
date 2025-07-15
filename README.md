
# G Finance FAQ Agent Guide

This Genesys Cloud Guide provides an intelligent, conversational FAQ experience for G Finance customers. The guide integrates with a knowledge base search function to deliver accurate, grounded responses while maintaining a natural conversation flow.

## Overview

The G Finance FAQ Agent is a text-based conversational guide that:

- Provides customer service for G Finance-related inquiries
- Searches a knowledge base to ground all responses in accurate information
- Maintains conversation context through summary variables
- Delivers responses in a natural, professional tone without revealing internal processes
- Handles conversation flow from greeting to closure

## Key Features

- **Knowledge Base Integration**: Automatically searches and retrieves relevant information from your knowledge base
- **Context Awareness**: Uses conversation summaries to maintain natural dialogue flow
- **Hallucination Prevention**: All responses are grounded in actual knowledge base content
- **Professional Tone**: Speaks as a knowledgeable G Finance representative
- **Conversation Management**: Handles complete conversation lifecycle with proper opening and closing

## Prerequisites

Before setting up this guide, ensure you have:

1. **Knowledge Base**: A populated Genesys Cloud knowledge base with G Finance articles
2. **OAuth Client**: Genesys Cloud OAuth client with Client Credentials grant type
3. **Function Integration**: The Knowledge Base Search function deployed and configured
4. **Required Permissions**: `knowledge:document:search` permission for the OAuth client

## Setup Instructions

### Step 1: Prepare Your Knowledge Base

1. **Create your knowledge base** with G Finance articles
   - **CRITICAL**: Enable "Content Search" during knowledge base creation
   - Content Search can ONLY be enabled at creation time and cannot be added later
   - Without Content Search, the FAQ guide performance will be notably reduced
2. Populate the knowledge base with relevant G Finance articles
3. Note the Knowledge Base ID (export to JSON format and grab the ID from the beginning of the file)
4. Test the knowledge base search functionality to ensure articles are properly indexed

### Step 2: Configure OAuth Client

Create a Genesys Cloud OAuth client with:
- Grant type: Client Credentials
- Required permission: `knowledge:document:search`
- Note the Client ID and Client Secret for function configuration

### Step 3: Deploy the Knowledge Base Search Function

1. Follow the instructions from the Knowledge Base Search Function README
2. Create the function integration with proper credentials:
   - `GC_Client_Id`: Your OAuth client ID
   - `GC_Client_Secret`: Your OAuth client secret
3. Test the function to ensure it returns properly formatted responses

### Step 4: Create the Guide

1. **Create Guide Variables**:
   
   Navigate to the Guide creation interface and create these variables:

   - **summary_in**
     - Availability: Input
     - Description: Summary of previous customer conversation, before reaching this workflow. If empty, ignore.
     - Type: string

   - **summary_out**
     - Availability: Output
     - Description: A compact summary of all the conversation so far.
     - Type: string

   - **kb_id**
     - Availability: Input
     - Description: The id of the knowledge base used to ground responses.
     - Type: string

   - **kb_confidence_score**
     - Availability: Input
     - Description: Minimum confidence threshold for an article of the knowledge base to be considered semantically relevant for the customer query.
     - Type: number

2. **Configure the Guide Prompt**:
   
   Paste the guide prompt and manually replace the action reference using the "/" menu to ensure proper recognition of your specific function integration.

3. **Test the Guide**:
   
   Use the guide testing interface to verify responses are properly grounded and formatted.

### Step 5: Create the Bot Flow

Create a simple digital bot flow with:
1. **Call Guide** action pointing to your G Finance FAQ Agent Guide
2. **Disconnect** action to end the conversation

## Guide Variables and Context Management

### Input Variables

- **summary_in**: Contains a summary of any previous conversation the customer had before reaching this guide. This enables the guide to maintain context across multiple interactions or when transferring between different parts of your bot flow.

- **kb_id**: The unique identifier of your knowledge base. This allows the same guide to work with different knowledge bases in different environments (dev, test, prod).

- **kb_confidence_score**: The minimum confidence threshold (0.0 to 1.0) for knowledge base search results. Higher values return more precise matches but may miss some relevant content.

### Output Variables

- **summary_out**: A concise summary of the entire conversation that occurred within the guide. This can be used by the parent Architect flow for:
  - Logging and analytics
  - Passing context to subsequent guides or actions
  - Escalation information for human agents

### Context Flow Between Multiple Guides

When using multiple guides in a single Architect flow, you can chain context between them:

1. **First Guide** → Outputs `summary_out`
2. **Architect Flow** → Captures the summary and passes it to the next guide
3. **Second Guide** → Receives the summary as `summary_in`

Example Architect flow structure:
```
Start architect flow → Call Guide 1 → Return to architect flow and store Guide 1 summary → Call Guide 2 (with summary_in) → End
```

This pattern allows for complex conversational flows while maintaining context continuity.

## Configuration Examples

### Basic Configuration
```json
{
  "kb_id": "your-knowledge-base-id-here",
  "kb_confidence_score": 0.7,
  "summary_in": ""
}
```

### With Previous Context
```json
{
  "kb_id": "your-knowledge-base-id-here",
  "kb_confidence_score": 0.7,
  "summary_in": "Customer asked about account balance and payment due date. Provided account info and payment options."
}
```

## Best Practices

### Knowledge Base Management
- **Enable Content Search**: Ensure Content Search is enabled during knowledge base creation (cannot be added later)
- Keep articles well-structured and up-to-date
- Use clear, customer-friendly language in your knowledge base articles
- Regularly review and update content based on customer interactions

### Confidence Scoring
- Start with a confidence score of 0.6 or 0.7 for testing
- Adjust based on response quality:
  - Lower scores (0.5-0.6) for broader matches
  - Higher scores (0.8-0.9) for more precise matches

### Testing
- Test with various customer queries to ensure proper grounding
- Verify that the guide handles "no results" scenarios gracefully
- Test context flow between multiple guides if applicable

## Troubleshooting

### Common Issues

1. **No Knowledge Base Results**
   - Check knowledge base ID is correct
   - Verify Content Search is enabled (must be set at creation time)
   - Ensure articles are published
   - Lower confidence score for testing

2. **Function Integration Errors**
   - Verify OAuth credentials are correct
   - Check function deployment and permissions
   - Test function independently before guide integration

3. **Context Not Flowing**
   - Ensure variable names match exactly
   - Check that parent flow is properly passing variables
   - Verify variable types are correct

### Debugging Steps

1. Test the knowledge base search function independently
2. Use the guide testing interface to verify responses
3. Check Architect flow logs for variable passing issues
4. Monitor function execution logs for errors
