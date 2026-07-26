"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provisionUserProfile = void 0;
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
var userProvisioning_1 = require("./userProvisioning");
Object.defineProperty(exports, "provisionUserProfile", { enumerable: true, get: function () { return userProvisioning_1.provisionUserProfile; } });
//# sourceMappingURL=index.js.map