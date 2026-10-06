const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'feexsystems-prod-508304-service',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const upsertWorldProjectRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertWorldProject', inputVars);
}
upsertWorldProjectRef.operationName = 'UpsertWorldProject';
exports.upsertWorldProjectRef = upsertWorldProjectRef;

exports.upsertWorldProject = function upsertWorldProject(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(upsertWorldProjectRef(dcInstance, inputVars));
}
;

const insertWorldEvidenceRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertWorldEvidence', inputVars);
}
insertWorldEvidenceRef.operationName = 'InsertWorldEvidence';
exports.insertWorldEvidenceRef = insertWorldEvidenceRef;

exports.insertWorldEvidence = function insertWorldEvidence(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(insertWorldEvidenceRef(dcInstance, inputVars));
}
;

const recordTelemetryEventRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'RecordTelemetryEvent', inputVars);
}
recordTelemetryEventRef.operationName = 'RecordTelemetryEvent';
exports.recordTelemetryEventRef = recordTelemetryEventRef;

exports.recordTelemetryEvent = function recordTelemetryEvent(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(recordTelemetryEventRef(dcInstance, inputVars));
}
;

const listWorldProjectsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListWorldProjects');
}
listWorldProjectsRef.operationName = 'ListWorldProjects';
exports.listWorldProjectsRef = listWorldProjectsRef;

exports.listWorldProjects = function listWorldProjects(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listWorldProjectsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getWorldProjectRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetWorldProject', inputVars);
}
getWorldProjectRef.operationName = 'GetWorldProject';
exports.getWorldProjectRef = getWorldProjectRef;

exports.getWorldProject = function getWorldProject(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getWorldProjectRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listWorldEvidencesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListWorldEvidences', inputVars);
}
listWorldEvidencesRef.operationName = 'ListWorldEvidences';
exports.listWorldEvidencesRef = listWorldEvidencesRef;

exports.listWorldEvidences = function listWorldEvidences(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listWorldEvidencesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listWorldTelemetryEventsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListWorldTelemetryEvents');
}
listWorldTelemetryEventsRef.operationName = 'ListWorldTelemetryEvents';
exports.listWorldTelemetryEventsRef = listWorldTelemetryEventsRef;

exports.listWorldTelemetryEvents = function listWorldTelemetryEvents(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listWorldTelemetryEventsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;
