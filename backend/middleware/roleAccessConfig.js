// roleAccessConfig.js
export const roleAccessRules = {
  admin: ["GET", "POST", "PUT", "DELETE"],   // full access
  tester: ["GET", "POST", "PUT","DELETE"],            // can create & update
  viewer: ["GET"],                           // read-only
  manager: ["GET", "POST", "PUT", "DELETE"], // full access
  developer: ["GET", "POST", "PUT","DELETE"],        // can create & update
  reporter: ["GET"],              // can read & create
};
