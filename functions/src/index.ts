import { initializeApp } from "firebase-admin/app";

initializeApp();

export { provisionUserProfile } from "./userProvisioning";
export { aggregatePriceSubmission } from "./priceAggregation";
