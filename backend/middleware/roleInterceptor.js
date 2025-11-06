const { roleAccessRules } = require("./roleAccessConfig");
const authMiddleware = require("./auth");
const { DataTypes } = require("sequelize");
const defineMember = require("../models/members"); // your Members model

function roleInterceptor(req, res, next) {
  try {
    const publicPaths = ["/users/signin", "/users/signup", "/health"];
    if (publicPaths.some((path) => req.path.startsWith(path))) {
      console.log("[RBAC] Public path accessed, skipping role check:", req.path);
      return next();
    }

    const sequelize = req.app?.get("sequelize");
    const auth = authMiddleware(sequelize);

    // First validate JWT
    auth.verifySignedIn(req, res, async () => {
      try {
        const user = req.user || {};
        const userId = req.userId;
        const method = req.method.toUpperCase();

        // 🧭 1️⃣ Determine action type
        const action = ["GET"].includes(method) ? "read" : "edit";
        console.log(`[RBAC] User ${userId} attempting '${method}' (${action})`);
        // 🧭 2️⃣ Check DB-based permissions (Members table)
        const Member = defineMember(sequelize, DataTypes);

        const projectId =
          req.params.projectId ||
          req.query.projectId ||
          req.body.projectId ||
          null;

        console.log(`[RBAC] Checking DB permissions for User: ${userId}, Project: ${projectId || "N/A"}`);
        let userPermission = null;
        if (projectId) {
          const memberRecord = await Member.findOne({
            where: { projectId, userId },
          });

          if (memberRecord) {
            userPermission = {
              canRead: memberRecord.canRead,
              canEdit: memberRecord.canEdit,
            };
          } else {
            // If not in members, assume read-only if project is public (optional)
            userPermission = { canRead: false, canEdit: false };
          }
        }

        // 🧭 3️⃣ Static role-based fallback
        const allowedMethods = roleAccessRules[user.role] || [];

        // 🧭 4️⃣ Decision logic
        const hasStaticAccess = allowedMethods.includes(method);
        const hasDbAccess =
          (action === "read" && userPermission?.canRead) ||
          (action === "edit" && userPermission?.canEdit);

        console.log(
          `[RBAC] User: ${user.email || user.id}, Role: ${
            user.role
          }, Method: ${method}, Project: ${projectId || "N/A"}`
        );

        // 🧩 If neither static nor DB grants permission
        if (!hasStaticAccess && !hasDbAccess) {
          console.warn(
            `[RBAC] Denied → User ${userId} tried '${method}' without permission`
          );
          return res.status(403).json({
            success: false,
            message: `Access denied: you do not have ${action.toUpperCase()} permission for this resource.`,
          });
        }

        // ✅ Allowed
        next();
      } catch (err) {
        console.error("[RBAC] Internal Role Validation Error:", err);
        res.status(500).json({
          success: false,
          message: "Role validation error",
          error: err.message,
        });
      }
    });
  } catch (err) {
    console.error("[RBAC] Fatal Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Role interceptor initialization failed",
      error: err.message,
    });
  }
}

module.exports = { roleInterceptor };
