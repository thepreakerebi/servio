/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as agents_emailDraftAgent from "../agents/emailDraftAgent.js";
import type * as agents_ticketAnalysisAgent from "../agents/ticketAnalysisAgent.js";
import type * as agents_tools_analyzeImage from "../agents/tools/analyzeImage.js";
import type * as agents_tools_classifyIssue from "../agents/tools/classifyIssue.js";
import type * as agents_tools_draftEmail from "../agents/tools/draftEmail.js";
import type * as agents_tools_searchVendors from "../agents/tools/searchVendors.js";
import type * as agents_tools_updateTicket from "../agents/tools/updateTicket.js";
import type * as agents_vendorConversationAgent from "../agents/vendorConversationAgent.js";
import type * as agents_vendorDiscoveryAgent from "../agents/vendorDiscoveryAgent.js";
import type * as agents_vendorRankingAgent from "../agents/vendorRankingAgent.js";
import type * as agents_vendorResponseAgent from "../agents/vendorResponseAgent.js";
import type * as analytics_getDashboardStats from "../analytics/getDashboardStats.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as conversations_addMessage from "../conversations/addMessage.js";
import type * as conversations_create from "../conversations/create.js";
import type * as conversations_getById from "../conversations/getById.js";
import type * as conversations_getByIdInternal from "../conversations/getByIdInternal.js";
import type * as conversations_getByTicketId from "../conversations/getByTicketId.js";
import type * as conversations_getByTicketIdInternal from "../conversations/getByTicketIdInternal.js";
import type * as emails_forwardToUser from "../emails/forwardToUser.js";
import type * as emails_handleEmailEvent from "../emails/handleEmailEvent.js";
import type * as emails_handleInboundEmail from "../emails/handleInboundEmail.js";
import type * as emails_handleWebhook from "../emails/handleWebhook.js";
import type * as emails_sendVendorEmail from "../emails/sendVendorEmail.js";
import type * as emails_storeEmailMapping from "../emails/storeEmailMapping.js";
import type * as embeddings_generateConversationEmbedding from "../embeddings/generateConversationEmbedding.js";
import type * as embeddings_generateTicketEmbedding from "../embeddings/generateTicketEmbedding.js";
import type * as embeddings_generateVendorEmbedding from "../embeddings/generateVendorEmbedding.js";
import type * as embeddings_generateVendorOutreachEmbedding from "../embeddings/generateVendorOutreachEmbedding.js";
import type * as embeddings_generateVendorQuoteEmbedding from "../embeddings/generateVendorQuoteEmbedding.js";
import type * as embeddings_updateConversationEmbedding from "../embeddings/updateConversationEmbedding.js";
import type * as embeddings_updateTicketEmbedding from "../embeddings/updateTicketEmbedding.js";
import type * as embeddings_updateVendorEmbedding from "../embeddings/updateVendorEmbedding.js";
import type * as embeddings_updateVendorOutreachEmbedding from "../embeddings/updateVendorOutreachEmbedding.js";
import type * as embeddings_updateVendorQuoteEmbedding from "../embeddings/updateVendorQuoteEmbedding.js";
import type * as files_deletePhoto from "../files/deletePhoto.js";
import type * as files_getPhotoUrl from "../files/getPhotoUrl.js";
import type * as files_uploadPhoto from "../files/uploadPhoto.js";
import type * as firecrawlResults_getById from "../firecrawlResults/getById.js";
import type * as firecrawlResults_getByTicketId from "../firecrawlResults/getByTicketId.js";
import type * as firecrawlResults_store from "../firecrawlResults/store.js";
import type * as http from "../http.js";
import type * as prompts_classifyIssue from "../prompts/classifyIssue.js";
import type * as prompts_draftEmail from "../prompts/draftEmail.js";
import type * as prompts_emailDraft from "../prompts/emailDraft.js";
import type * as prompts_ticketAnalysis from "../prompts/ticketAnalysis.js";
import type * as prompts_vendorConversation from "../prompts/vendorConversation.js";
import type * as prompts_vendorDiscovery from "../prompts/vendorDiscovery.js";
import type * as prompts_vendorExtraction from "../prompts/vendorExtraction.js";
import type * as prompts_vendorResponse from "../prompts/vendorResponse.js";
import type * as tickets_assignVendor from "../tickets/assignVendor.js";
import type * as tickets_closeTicket from "../tickets/closeTicket.js";
import type * as tickets_create from "../tickets/create.js";
import type * as tickets_getById from "../tickets/getById.js";
import type * as tickets_getByIdInternal from "../tickets/getByIdInternal.js";
import type * as tickets_list from "../tickets/list.js";
import type * as tickets_scheduleRepair from "../tickets/scheduleRepair.js";
import type * as tickets_searchSimilar from "../tickets/searchSimilar.js";
import type * as tickets_update from "../tickets/update.js";
import type * as tickets_updateInternal from "../tickets/updateInternal.js";
import type * as tickets_updateStatus from "../tickets/updateStatus.js";
import type * as users_getById from "../users/getById.js";
import type * as users_getCurrent from "../users/getCurrent.js";
import type * as users_updateProfile from "../users/updateProfile.js";
import type * as vendorOutreach_create from "../vendorOutreach/create.js";
import type * as vendorOutreach_getByEmailId from "../vendorOutreach/getByEmailId.js";
import type * as vendorOutreach_getByEmailIdInternal from "../vendorOutreach/getByEmailIdInternal.js";
import type * as vendorOutreach_getByIdInternal from "../vendorOutreach/getByIdInternal.js";
import type * as vendorOutreach_getByTicketId from "../vendorOutreach/getByTicketId.js";
import type * as vendorOutreach_sendOutreachEmails from "../vendorOutreach/sendOutreachEmails.js";
import type * as vendorOutreach_updateStatus from "../vendorOutreach/updateStatus.js";
import type * as vendorQuotes_create from "../vendorQuotes/create.js";
import type * as vendorQuotes_getById from "../vendorQuotes/getById.js";
import type * as vendorQuotes_getByIdInternal from "../vendorQuotes/getByIdInternal.js";
import type * as vendorQuotes_getByTicketId from "../vendorQuotes/getByTicketId.js";
import type * as vendorQuotes_getByTicketIdInternal from "../vendorQuotes/getByTicketIdInternal.js";
import type * as vendorQuotes_getRecommendations from "../vendorQuotes/getRecommendations.js";
import type * as vendorQuotes_selectVendor from "../vendorQuotes/selectVendor.js";
import type * as vendorQuotes_updateScore from "../vendorQuotes/updateScore.js";
import type * as vendorQuotes_updateStatus from "../vendorQuotes/updateStatus.js";
import type * as vendors_addJob from "../vendors/addJob.js";
import type * as vendors_create from "../vendors/create.js";
import type * as vendors_getByEmail from "../vendors/getByEmail.js";
import type * as vendors_getById from "../vendors/getById.js";
import type * as vendors_getByIdInternal from "../vendors/getByIdInternal.js";
import type * as vendors_getByTicket from "../vendors/getByTicket.js";
import type * as vendors_list from "../vendors/list.js";
import type * as vendors_listInternal from "../vendors/listInternal.js";
import type * as vendors_searchExisting from "../vendors/searchExisting.js";
import type * as vendors_updateRating from "../vendors/updateRating.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "agents/emailDraftAgent": typeof agents_emailDraftAgent;
  "agents/ticketAnalysisAgent": typeof agents_ticketAnalysisAgent;
  "agents/tools/analyzeImage": typeof agents_tools_analyzeImage;
  "agents/tools/classifyIssue": typeof agents_tools_classifyIssue;
  "agents/tools/draftEmail": typeof agents_tools_draftEmail;
  "agents/tools/searchVendors": typeof agents_tools_searchVendors;
  "agents/tools/updateTicket": typeof agents_tools_updateTicket;
  "agents/vendorConversationAgent": typeof agents_vendorConversationAgent;
  "agents/vendorDiscoveryAgent": typeof agents_vendorDiscoveryAgent;
  "agents/vendorRankingAgent": typeof agents_vendorRankingAgent;
  "agents/vendorResponseAgent": typeof agents_vendorResponseAgent;
  "analytics/getDashboardStats": typeof analytics_getDashboardStats;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  "conversations/addMessage": typeof conversations_addMessage;
  "conversations/create": typeof conversations_create;
  "conversations/getById": typeof conversations_getById;
  "conversations/getByIdInternal": typeof conversations_getByIdInternal;
  "conversations/getByTicketId": typeof conversations_getByTicketId;
  "conversations/getByTicketIdInternal": typeof conversations_getByTicketIdInternal;
  "emails/forwardToUser": typeof emails_forwardToUser;
  "emails/handleEmailEvent": typeof emails_handleEmailEvent;
  "emails/handleInboundEmail": typeof emails_handleInboundEmail;
  "emails/handleWebhook": typeof emails_handleWebhook;
  "emails/sendVendorEmail": typeof emails_sendVendorEmail;
  "emails/storeEmailMapping": typeof emails_storeEmailMapping;
  "embeddings/generateConversationEmbedding": typeof embeddings_generateConversationEmbedding;
  "embeddings/generateTicketEmbedding": typeof embeddings_generateTicketEmbedding;
  "embeddings/generateVendorEmbedding": typeof embeddings_generateVendorEmbedding;
  "embeddings/generateVendorOutreachEmbedding": typeof embeddings_generateVendorOutreachEmbedding;
  "embeddings/generateVendorQuoteEmbedding": typeof embeddings_generateVendorQuoteEmbedding;
  "embeddings/updateConversationEmbedding": typeof embeddings_updateConversationEmbedding;
  "embeddings/updateTicketEmbedding": typeof embeddings_updateTicketEmbedding;
  "embeddings/updateVendorEmbedding": typeof embeddings_updateVendorEmbedding;
  "embeddings/updateVendorOutreachEmbedding": typeof embeddings_updateVendorOutreachEmbedding;
  "embeddings/updateVendorQuoteEmbedding": typeof embeddings_updateVendorQuoteEmbedding;
  "files/deletePhoto": typeof files_deletePhoto;
  "files/getPhotoUrl": typeof files_getPhotoUrl;
  "files/uploadPhoto": typeof files_uploadPhoto;
  "firecrawlResults/getById": typeof firecrawlResults_getById;
  "firecrawlResults/getByTicketId": typeof firecrawlResults_getByTicketId;
  "firecrawlResults/store": typeof firecrawlResults_store;
  http: typeof http;
  "prompts/classifyIssue": typeof prompts_classifyIssue;
  "prompts/draftEmail": typeof prompts_draftEmail;
  "prompts/emailDraft": typeof prompts_emailDraft;
  "prompts/ticketAnalysis": typeof prompts_ticketAnalysis;
  "prompts/vendorConversation": typeof prompts_vendorConversation;
  "prompts/vendorDiscovery": typeof prompts_vendorDiscovery;
  "prompts/vendorExtraction": typeof prompts_vendorExtraction;
  "prompts/vendorResponse": typeof prompts_vendorResponse;
  "tickets/assignVendor": typeof tickets_assignVendor;
  "tickets/closeTicket": typeof tickets_closeTicket;
  "tickets/create": typeof tickets_create;
  "tickets/getById": typeof tickets_getById;
  "tickets/getByIdInternal": typeof tickets_getByIdInternal;
  "tickets/list": typeof tickets_list;
  "tickets/scheduleRepair": typeof tickets_scheduleRepair;
  "tickets/searchSimilar": typeof tickets_searchSimilar;
  "tickets/update": typeof tickets_update;
  "tickets/updateInternal": typeof tickets_updateInternal;
  "tickets/updateStatus": typeof tickets_updateStatus;
  "users/getById": typeof users_getById;
  "users/getCurrent": typeof users_getCurrent;
  "users/updateProfile": typeof users_updateProfile;
  "vendorOutreach/create": typeof vendorOutreach_create;
  "vendorOutreach/getByEmailId": typeof vendorOutreach_getByEmailId;
  "vendorOutreach/getByEmailIdInternal": typeof vendorOutreach_getByEmailIdInternal;
  "vendorOutreach/getByIdInternal": typeof vendorOutreach_getByIdInternal;
  "vendorOutreach/getByTicketId": typeof vendorOutreach_getByTicketId;
  "vendorOutreach/sendOutreachEmails": typeof vendorOutreach_sendOutreachEmails;
  "vendorOutreach/updateStatus": typeof vendorOutreach_updateStatus;
  "vendorQuotes/create": typeof vendorQuotes_create;
  "vendorQuotes/getById": typeof vendorQuotes_getById;
  "vendorQuotes/getByIdInternal": typeof vendorQuotes_getByIdInternal;
  "vendorQuotes/getByTicketId": typeof vendorQuotes_getByTicketId;
  "vendorQuotes/getByTicketIdInternal": typeof vendorQuotes_getByTicketIdInternal;
  "vendorQuotes/getRecommendations": typeof vendorQuotes_getRecommendations;
  "vendorQuotes/selectVendor": typeof vendorQuotes_selectVendor;
  "vendorQuotes/updateScore": typeof vendorQuotes_updateScore;
  "vendorQuotes/updateStatus": typeof vendorQuotes_updateStatus;
  "vendors/addJob": typeof vendors_addJob;
  "vendors/create": typeof vendors_create;
  "vendors/getByEmail": typeof vendors_getByEmail;
  "vendors/getById": typeof vendors_getById;
  "vendors/getByIdInternal": typeof vendors_getByIdInternal;
  "vendors/getByTicket": typeof vendors_getByTicket;
  "vendors/list": typeof vendors_list;
  "vendors/listInternal": typeof vendors_listInternal;
  "vendors/searchExisting": typeof vendors_searchExisting;
  "vendors/updateRating": typeof vendors_updateRating;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
