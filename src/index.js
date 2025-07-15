/**
 * Genesys Cloud Function for Knowledge Base Search
 * 
 * Makes a single API call to:
 * POST /api/v2/knowledge/knowledgebases/{KBId}/documents/search
 * 
 * 
 * Processes the complex nested JSON response structure to extract
 * readable text from various block types (paragraphs, lists, tables, etc.)
 *
 * Required inputs:
 *   - query: string, the search query for the knowledge base
 *   - KBId: string, the knowledge base ID
 *   - maxArticles: integer, maximum number of articles to return
 *   - minConfidence: number, minimum confidence threshold
 *   - domain: string, the Genesys Cloud domain (e.g., "mypurecloud.de")
 */

const axios = require('axios');

const inputSchema = {
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "required": [
    "query",
    "KBId",
    "maxArticles",
    "minConfidence",
    "domain"
  ],
  "properties": {
    "query": {
      "type": "string",
      "description": "Input query to the knowledge base"
    },
    "KBId": {
      "type": "string",
      "description": "Knowledge base ID"
    },
    "maxArticles": {
      "type": "integer",
      "description": "Maximum number of articles to return"
    },
    "minConfidence": {
      "type": "number",
      "description": "Minimum confidence threshold"
    },
    "domain": {
      "type": "string",
      "description": "Genesys Cloud domain (e.g., mypurecloud.de, mypurecloud.com)"
    }
  }
};

const outputSchema = {
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "required": [
    "answer"
  ],
  "properties": {
    "answer": {
      "type": "string",
      "description": "The extracted readable answer from the knowledge base"
    }
  },
  "additionalProperties": false
};

/**
 * Validates the input payload against the input schema
 */
function validateInput(data) {
  // Check required fields
  for (const requiredProperty of inputSchema.required) {
    if (!(requiredProperty in data)) {
      return `Missing required property: ${requiredProperty}`;
    }
  }
  
  // Validate types
  for (const propertyName of Object.keys(inputSchema.properties)) {
    const schemaType = inputSchema.properties[propertyName].type;
    if (propertyName in data) {
      if (schemaType === 'string' && typeof data[propertyName] !== 'string') {
        return `Property '${propertyName}' should be a string`;
      } else if (schemaType === 'number' && typeof data[propertyName] !== 'number') {
        return `Property '${propertyName}' should be a number`;
      } else if (schemaType === 'integer' && (!Number.isInteger(data[propertyName]) || typeof data[propertyName] !== 'number')) {
        return `Property '${propertyName}' should be an integer`;
      }
    }
  }
  
  return null;
}

/**
 * Formats the output according to the output schema
 */
function formatOutput(output) {
  const formattedOutput = {};
  
  // Copy known properties
  Object.keys(outputSchema.properties).forEach((prop) => {
    if (prop in output) {
      formattedOutput[prop] = output[prop];
    }
  });
  
  // Check required properties
  for (const requiredProperty of outputSchema.required) {
    if (!formattedOutput.hasOwnProperty(requiredProperty)) {
      console.error(`Missing required output property: ${requiredProperty}`);
      return {
        answer: "Internal error: missing required output property"
      };
    }
  }
  
  return formattedOutput;
}

/**
 * Obtains a Genesys Cloud OAuth token
 */
async function getGenesysCloudToken(domain, credentials) {
  const gcClientId = credentials?.gcClientId;
  const gcClientSecret = credentials?.gcClientSecret;
  
  if (!gcClientId || !gcClientSecret) {
    throw new Error("Missing gcClientId or gcClientSecret for Genesys Cloud API call");
  }
  
  const tokenUrl = `https://login.${domain}/oauth/token`;
  
  try {
    const tokenResp = await axios.post(tokenUrl, null, {
      params: { grant_type: "client_credentials" },
      headers: {
        "Authorization": "Basic " + Buffer.from(`${gcClientId}:${gcClientSecret}`).toString('base64')
      }
    });
    
    const accessToken = tokenResp.data.access_token;
    if (!accessToken) {
      throw new Error("Failed to obtain access token from Genesys Cloud");
    }
    
    return accessToken;
  } catch (err) {
    throw new Error("Failed to obtain Genesys Cloud OAuth token: " + err.message);
  }
}

/**
 * Recursively extracts text from blocks
 */
function extractTextFromBlocks(blocks) {
  if (!blocks || !Array.isArray(blocks)) {
    return '';
  }
  
  let text = '';
  
  for (const block of blocks) {
    if (!block || typeof block !== 'object') {
      continue;
    }
    
    // Handle different block types
    switch (block.type) {
      case 'Text':
        if (block.text && block.text.text) {
          text += block.text.text;
        }
        break;
        
      case 'Paragraph':
        if (block.paragraph && block.paragraph.blocks) {
          const paragraphText = extractTextFromBlocks(block.paragraph.blocks);
          if (paragraphText.trim()) {
            text += paragraphText + '\n\n';
          }
        }
        break;
        
      case 'UnorderedList':
      case 'OrderedList':
        if (block.list && block.list.blocks) {
          for (const listItem of block.list.blocks) {
            if (listItem.type === 'ListItem' && listItem.blocks) {
              const listItemText = extractTextFromBlocks(listItem.blocks);
              if (listItemText.trim()) {
                text += '• ' + listItemText + '\n';
              }
            }
          }
          text += '\n';
        }
        break;
        
      case 'ListItem':
        if (block.blocks) {
          const listItemText = extractTextFromBlocks(block.blocks);
          if (listItemText.trim()) {
            text += listItemText;
          }
        }
        break;
        
      case 'Table':
        if (block.table && block.table.rows) {
          for (const row of block.table.rows) {
            if (row.cells) {
              let rowText = '';
              for (const cell of row.cells) {
                if (cell.blocks) {
                  const cellText = extractTextFromBlocks(cell.blocks);
                  if (cellText.trim()) {
                    rowText += cellText.trim() + ' | ';
                  }
                }
              }
              if (rowText.trim()) {
                text += rowText.trim() + '\n';
              }
            }
          }
          text += '\n';
        }
        break;
        
      case 'Image':
        // For images, we might want to include alt text if available
        if (block.image && block.image.properties && block.image.properties.altText) {
          text += `[Image: ${block.image.properties.altText}]\n`;
        }
        break;
        
      case 'Video':
        // For videos, we might want to include a placeholder
        text += '[Video content]\n';
        break;
        
      default:
        // For unknown block types, try to extract text recursively
        if (block.blocks) {
          text += extractTextFromBlocks(block.blocks);
        }
        break;
    }
  }
  
  return text;
}

/**
 * Extracts readable text from a document variation
 */
function extractTextFromVariation(variation) {
  if (!variation || !variation.body || !variation.body.blocks) {
    return '';
  }
  
  return extractTextFromBlocks(variation.body.blocks);
}

/**
 * Processes the knowledge base search response to extract readable text
 */
function processKnowledgeBaseResponse(response) {
  if (!response || !response.results || !Array.isArray(response.results)) {
    return 'No results found';
  }
  
  let combinedAnswer = '';
  
  for (const result of response.results) {
    if (!result.document) {
      continue;
    }
    
    const document = result.document;
    
    // Extract text from all variations
    if (document.variations && Array.isArray(document.variations)) {
      for (const variation of document.variations) {
        const variationText = extractTextFromVariation(variation);
        if (variationText.trim()) {
          combinedAnswer += variationText.trim() + '\n\n';
        }
      }
    }
  }
  
  // Clean up the combined answer
  combinedAnswer = combinedAnswer.trim();
  
  // If no text was extracted, try to use the answer field if available
  if (!combinedAnswer && response.answerGeneration && response.answerGeneration.answer) {
    combinedAnswer = response.answerGeneration.answer;
  }
  
  return combinedAnswer || 'No content found in the knowledge base results';
}

/**
 * Calls the knowledge base search API with AnswerHighlight mode
 */
async function searchKnowledgeBase(domain, accessToken, payload) {
  const searchUrl = `https://api.${domain}/api/v2/knowledge/knowledgebases/${payload.KBId}/documents/search?expand=documentVariations`;
  
  const requestBody = {
    query: payload.query,
    pageSize: payload.maxArticles,
    confidenceThreshold: payload.minConfidence,
    answerMode: ["AnswerHighlight"],
    queryType: "AutoSearch"
  };
  
  try {
    const response = await axios.post(searchUrl, requestBody, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });
    
    return response.data;
  } catch (err) {
    throw new Error("Failed to search knowledge base: " + (err.response?.data?.message || err.message));
  }
}

exports.handler = async (event, context, callback) => {
  console.log("## Context: " + JSON.stringify(context));
  console.log("## Event: " + JSON.stringify(event));
  
  try {
    // Parse input payload
    let payload;
    if (event.rawRequest) {
      try {
        payload = JSON.parse(event.rawRequest);
        console.log("Parsed rawRequest JSON successfully:", payload);
      } catch (parseErr) {
        console.error("Failed to parse rawRequest JSON:", parseErr);
        const errorResponse = formatOutput({
          answer: "Invalid JSON input"
        });
        return callback(null, errorResponse);
      }
    } else {
      payload = event;
      console.log("Using event as payload:", payload);
    }
    
    // Validate input
    const inputError = validateInput(payload);
    if (inputError) {
      const errorResponse = formatOutput({
        answer: `Invalid input: ${inputError}`
      });
      return callback(null, errorResponse);
    }
    
    // Extract Genesys Cloud credentials
    const gcCredentials = {
      gcClientId: (event.headers && event.headers.gcClientId) || (context.clientContext && context.clientContext.gcClientId),
      gcClientSecret: (event.headers && event.headers.gcClientSecret) || (context.clientContext && context.clientContext.gcClientSecret)
    };
    
    // Use the domain from the input payload
    const domain = payload.domain;
    
    // Get OAuth token
    let accessToken;
    try {
      accessToken = await getGenesysCloudToken(domain, gcCredentials);
    } catch (err) {
      console.error("Error obtaining Genesys Cloud token:", err.message);
      const errorResponse = formatOutput({
        answer: "Failed to obtain Genesys Cloud token"
      });
      return callback(null, errorResponse);
    }
    
    // Search knowledge base
    let searchResults;
    try {
      searchResults = await searchKnowledgeBase(domain, accessToken, payload);
      console.log("Search results:", JSON.stringify(searchResults, null, 2));
    } catch (err) {
      console.error("Error searching knowledge base:", err.message);
      const errorResponse = formatOutput({
        answer: "Failed to search knowledge base"
      });
      return callback(null, errorResponse);
    }
    
    // Check if we got results
    if (!searchResults.results || searchResults.results.length === 0) {
      const errorResponse = formatOutput({
        answer: "No results found for your query."
      });
      return callback(null, errorResponse);
    }
    
    // Process the response to extract readable text
    const answer = processKnowledgeBaseResponse(searchResults);
    
    // Build success response
    const successResponse = formatOutput({
      answer: answer
    });
    
    return callback(null, successResponse);
    
  } catch (err) {
    console.error("Unexpected error in function:", err);
    const errorResponse = formatOutput({
      answer: "Internal error occurred"
    });
    return callback(null, errorResponse);
  }
};
