/**
 * Personalization Utility provides person details and personalized prompts
 **/
'use strict';

const EMPTY = "";
const AWS = require('aws-sdk');

/**
 * 
 * @param handlerInput Get PersonalizedPrompt from Id else default to Empty
 * @returns  Person's name in a response using alexa:name tag
 * example: <alexa:name type="first" personId="amzn1.ask.person.ABCDEF..."/>
 */
const getPersonalizedPrompt = (handlerInput) => {
    if (getPerson(handlerInput)) {
        return getPersonalizedPromptFromId(handlerInput);
    }
    return handleFallback;
}
/**
 * Get person from requestEnvelope if personalization enabled.
 * 
 */
const getPerson = (handlerInput) => { return handlerInput.requestEnvelope.context.System.person };

/**
 * Get person Id from requestEnvelope if personalization enabled.
 */
const getPersonId = (handlerInput) => { return getPerson(handlerInput).personId };

/**
 * Handle fallback logic incase person not found.
 */
const handleFallback = () => { return EMPTY }

/**
 * getPersonalizedPromptFromId: fetched the name associated with the personId/account.
 * This is an async function, caller are expected to wait till the response is obtained
 *
 * @param handlerInput --> Input recd as a part of the SPI
 * @return JSON
 *      Success:
 *          Response: {"resolvedName": "<<resolved name>>"}
 *      Failure/Exception/Error:
 *          Response: { error: { statusCode:"<<error status code>>", statusMessage :"error message"} }
 *
 *      statusCode possible values
 *          PERSON_PERMISSION_DENIED - person identifier, not consented
 *          UNKNOWN_ERROR - unknown error occurred
 *
 * If person is detected,
 *      if person has consented for sharing the name, fetch the name and returns
 *      if person has NOT consented for sharing the name, throws an error permission_denied
 *
 **/
const getPersonalizedPromptFromId = async(handlerInput) => {
        const client = handlerInput.serviceClientFactory.getUpsServiceClient();
        const personResponse = {};
        try {
            const personId = getPersonId(handlerInput);
            console.log("Received personId: ", personId);
            const givenName = await client.getPersonsProfileGivenName();
            console.log('Given person name successfully retrieved, now responding to user.' + givenName);
            if (givenName !== null) {
               personResponse.resolvedName = givenName;
            }
        } catch (error) {
            if (error.statusCode === 403) {
                ///no consent at person level, indicate to the caller
                console.log('getPersonalizedPromptFromId: error statusCode is 403 in getting person name, then invoke voice consent');
                personResponse.error = getErrorObj(PERSON_PERMISSION_DENIED, error.statusMessage);
            }
            else
            {
                console.log('Exception in processing getPersonalizedPromptFromId :  ${JSON.stringify(ex)}');
                personResponse.error = getErrorObj(UNKNOWN_ERROR, error.statusMessage);
            }
        }
        return personResponse;
  }

/**
 * Construct and return an error response
 * @param code --> Status Code to be added in the Error Json response
 * @param errorMessage --> Status Message to be added in the Error Json response
 *
 * @returns Error JSON. Example : {statusCode: "code", statusMessage :"errorMessage"}
 **/
function getErrorObj(code, errorMessage) {
    const error = {};
    error.statusCode = code;
    error.statusMessage = errorMessage;
    return error;
}

//static status codes used in responses to be validated by clients
const PERSON_PERMISSION_DENIED = "PERSON_PERMISSION_DENIED";
const UNKNOWN_ERROR = "UNKNOWN_ERROR";

/**
 * Export the list of needed for clients to use
 **/
module.exports = {
    getPersonalizedPrompt,
    getPerson,
    PERSON_PERMISSION_DENIED,
    UNKNOWN_ERROR
};