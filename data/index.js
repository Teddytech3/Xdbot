// Stub functions for now. Add real DB logic later.
const AntiDelDB = {};
const initializeAntiDeleteSettings = async () => {};
const setAnti = async () => {};
const getAnti = async () => {};
const getAllAntiDeleteSettings = async () => [];
const saveContact = async () => {};
const loadMessage = async () => null;
const getName = async () => '';
const getChatSummary = async () => {};
const saveGroupMetadata = async () => {};
const getGroupMetadata = async () => {};
const saveMessageCount = async () => {};
const getInactiveGroupMembers = async () => [];
const getGroupMembersMessageCount = async () => [];
const saveMessage = async () => {};

module.exports = {
  AntiDelDB, initializeAntiDeleteSettings, setAnti, getAnti, getAllAntiDeleteSettings,
  saveContact, loadMessage, getName, getChatSummary, saveGroupMetadata, getGroupMetadata,
  saveMessageCount, getInactiveGroupMembers, getGroupMembersMessageCount, saveMessage
};
