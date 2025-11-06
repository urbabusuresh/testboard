// routes/bugzilla/bugs.js
const express = require("express");
const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

module.exports = function (sequelize) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const {
        page = 1,
        limit = 1000,
        sortBy = "a.bug_id",
        sortOrder = "ASC",
        download = null,
        sendMail = null,
        ...filters
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClauses = [];
      const params = [];

      // Filters
      if (filters.priority) {
        whereClauses.push("a.priority = ?");
        params.push(filters.priority);
      }
      if (filters.bugid) {
        whereClauses.push("a.bug_id = ?");
        params.push(filters.bugid);
      }
      if (filters.severity) {
        whereClauses.push("a.bug_severity = ?");
        params.push(filters.severity);
      }
      if (filters.status) {
        whereClauses.push("a.bug_status = ?");
        params.push(filters.status);
      }
      if (filters.reporter) {
        whereClauses.push("reporter_profile.login_name = ?");
        params.push(filters.reporter);
      }
      if (filters.assignedTo) {
        whereClauses.push("assigned_to_profile.login_name = ?");
        params.push(filters.assignedTo);
      }
      if (filters.search) {
        whereClauses.push("(b.short_desc LIKE ? OR b.comments LIKE ?)");
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      // Date filters
      if (filters.fromDate && filters.toDate) {
        whereClauses.push("a.creation_ts BETWEEN ? AND ?");
        params.push(filters.fromDate, filters.toDate);
      } else if (filters.fromDate) {
        whereClauses.push("a.creation_ts >= ?");
        params.push(filters.fromDate);
      } else if (filters.toDate) {
        whereClauses.push("a.creation_ts <= ?");
        params.push(filters.toDate);
      }
      if (filters.greaterThanDate) {
        whereClauses.push("a.creation_ts > ?");
        params.push(filters.greaterThanDate);
      }

      const whereSQL = whereClauses.length
        ? "WHERE " + whereClauses.join(" AND ")
        : "";

      // ✅ Main query with extra "days_to_resolve"
      const query = `
        SELECT 
          a.bug_id,
          a.priority,
          a.bug_severity,
          a.bug_status,
          a.creation_ts,
          a.delta_ts,
          a.resolution,
          a.lastdiffed,
          b.short_desc,
          b.comments,
          b.comments_noprivate,
          assigned_to_profile.userid AS assigned_userid,
          assigned_to_profile.login_name AS assigned_to_name,
          assigned_to_profile.realname AS assigned_to_realname,
          reporter_profile.userid AS reporter_userid,
          reporter_profile.login_name AS reporter_name,
          reporter_profile.realname AS reporter_realname,
          CASE 
            WHEN a.resolution IS NOT NULL THEN DATEDIFF(a.delta_ts, a.creation_ts)
            ELSE NULL
          END AS days_to_resolve
        FROM 
          bugzilla.bugs a 
        JOIN 
          bugzilla.bugs_fulltext b ON a.bug_id = b.bug_id
        JOIN 
          bugzilla.profiles assigned_to_profile ON a.assigned_to = assigned_to_profile.userid
        JOIN 
          bugzilla.profiles reporter_profile ON a.reporter = reporter_profile.userid
        ${whereSQL}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?;
      `;

      // Count query unchanged
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM bugzilla.bugs a
        JOIN bugzilla.bugs_fulltext b ON a.bug_id = b.bug_id
        JOIN bugzilla.profiles assigned_to_profile ON a.assigned_to = assigned_to_profile.userid
        JOIN bugzilla.profiles reporter_profile ON a.reporter = reporter_profile.userid
        ${whereSQL};
      `;

      const [rows] = await sequelize.query(query, {
        replacements: [...params, +limit, +offset],
      });
      const [countResult] = await sequelize.query(countQuery, {
        replacements: params,
      });

      // Excel generation helper
      const generateExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Bugzilla Report");

        worksheet.columns = [
          { header: "Bug ID", key: "bug_id", width: 10 },
          { header: "Priority", key: "priority", width: 10 },
          { header: "Severity", key: "bug_severity", width: 12 },
          { header: "Status", key: "bug_status", width: 12 },
          { header: "Created", key: "creation_ts", width: 20 },
          { header: "Updated", key: "delta_ts", width: 20 },
          { header: "Resolution", key: "resolution", width: 15 },
          { header: "Summary", key: "short_desc", width: 40 },
          { header: "Assigned To", key: "assigned_to_realname", width: 20 },
          { header: "Reporter", key: "reporter_realname", width: 20 },
          { header: "Days to Resolve", key: "days_to_resolve", width: 18 },
        ];

        rows.forEach((row) => worksheet.addRow(row));

        return workbook;
      };

      // Download Excel
      if (download === "excel") {
        const workbook = await generateExcel();
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", "attachment; filename=bugs-report.xlsx");
        await workbook.xlsx.write(res);
        return res.end();
      }

      // Send by email
      if (sendMail) {
        const workbook = await generateExcel();
        const filePath = path.join(__dirname, "../../tmp/bugs-report.xlsx");
        await workbook.xlsx.writeFile(filePath);

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: sendMail,
          subject: "Bugzilla Report",
          text: "Please find attached the requested Bugzilla report.",
          attachments: [{ filename: "bugs-report.xlsx", path: filePath }],
        });

        fs.unlinkSync(filePath);
        return res.json({ message: `Report sent to ${sendMail}` });
      }

      // Default JSON response
      res.json({
        page: +page,
        limit: +limit,
        totalRecords: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
        bugs: rows,
      });
    } catch (err) {
      console.error("Error in GET /bugs:", err);
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /**
   * 🔹 Check if a bug exists
   * GET /bugzilla/bugs/:bugId/exists
   */
  router.get("/:bugId/exists", async (req, res) => {
    try {
      const bugId = req.params.bugId;

      // adjust query to match your schema
      const [rows] = await sequelize.query(
        "SELECT 1 FROM bugzilla.bugs WHERE bug_id = ? LIMIT 1",
        { replacements: [bugId] }
      );

      res.json({ exists: rows.length > 0 });
    } catch (err) {
      console.error("Error checking bug exists:", err);
      res.status(500).json({ error: "Bug existence check failed" });
    }
  });


  // GET /bugzilla/bugs/batch?ids=1,2,3
router.get("/batch", async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ error: "Please provide ids as a comma-separated list: ids=1,2" });
    }

    // parse and validate IDs
    const idArr = String(ids)
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    if (idArr.length === 0) {
      return res.status(400).json({ error: "No valid numeric ids found in query parameter 'ids'" });
    }
    if (idArr.length > 100) {
      return res.status(400).json({ error: "Too many ids; max 100 allowed" });
    }

    const placeholders = idArr.map(() => "?").join(",");

    // Use GROUP_CONCAT / MAX to avoid duplicate rows from joins (MySQL)
    const query = `
      SELECT
        a.bug_id,
        a.priority,
        a.bug_severity,
        a.bug_status,
        a.creation_ts,
        a.delta_ts,
        a.resolution,
        a.lastdiffed,
        MAX(b.short_desc) AS short_desc,
        GROUP_CONCAT(DISTINCT b.comments SEPARATOR '\n\n') AS comments,
        GROUP_CONCAT(DISTINCT b.comments_noprivate SEPARATOR '\n\n') AS comments_noprivate,
        assigned_to_profile.userid AS assigned_userid,
        assigned_to_profile.login_name AS assigned_to_name,
        assigned_to_profile.realname AS assigned_to_realname,
        reporter_profile.userid AS reporter_userid,
        reporter_profile.login_name AS reporter_name,
        reporter_profile.realname AS reporter_realname,
        CASE
          WHEN a.resolution IS NOT NULL THEN DATEDIFF(a.delta_ts, a.creation_ts)
          ELSE NULL
        END AS days_to_resolve
      FROM bugzilla.bugs a
      JOIN bugzilla.bugs_fulltext b ON a.bug_id = b.bug_id
      JOIN bugzilla.profiles assigned_to_profile ON a.assigned_to = assigned_to_profile.userid
      JOIN bugzilla.profiles reporter_profile ON a.reporter = reporter_profile.userid
      WHERE a.bug_id IN (${placeholders})
      GROUP BY a.bug_id
      ORDER BY a.bug_id;
    `;

    const [rows] = await sequelize.query(query, {
      replacements: idArr,
    });

    // Keep response order matching requested ids (optional)
    const rowsById = new Map(rows.map((r) => [Number(r.bug_id), r]));
    const ordered = idArr.map((id) => rowsById.get(id) || null);

    res.json({
      requestedIds: idArr,
      bugs: ordered.filter(Boolean), // remove not-found ids; include nulls if you prefer
      notFound: ordered.map((r, i) => (r ? null : idArr[i])).filter(Boolean),
    });
  } catch (err) {
    console.error("Error in GET /bugzilla/bugs/batch:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

  
// GET /bugzilla/bugs/testcase?testcaseIds=5 or testcaseIds=5,6
router.get("/testcase", async (req, res) => {
  try {
    const { testcaseIds } = req.query;
    if (!testcaseIds) {
      return res.status(400).json({ error: "Please provide testcaseIds as a comma-separated list: testcaseIds=5,6" });
    }

    // parse and validate testcase IDs
    const tcArr = String(testcaseIds)
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    if (tcArr.length === 0) {
      return res.status(400).json({ error: "No valid numeric testcaseIds found in query parameter 'testcaseIds'" });
    }
    if (tcArr.length > 100) {
      return res.status(400).json({ error: "Too many testcaseIds; max 100 allowed" });
    }

    // Build placeholders for testcase select
    const tcPlaceholders = tcArr.map(() => "?").join(",");

    // 1) Query testcase_executions to get bug_ids for provided testcase ids
    const selectBugIdsQuery = `
      SELECT bug_ids
      FROM rapr_test_automation.testcase_executions
      WHERE testcase_id IN (${tcPlaceholders})
        AND bug_ids IS NOT NULL
      ;
    `;

    // use SELECT type to get array of rows (each row is { bug_ids: '...' })
    const [tcRows] = await sequelize.query(selectBugIdsQuery, {
      replacements: tcArr,
    });

    // Robust parser: extract all digit sequences (handles formats like ["1","2"], [1,2], "1,2", 1;2 etc.)
    const parseBugIdsCell = (cell) => {
      if (cell === null || cell === undefined) return [];
      const s = String(cell);
      // match all groups of digits
      const matched = s.match(/\d+/g);
      if (!matched) return [];
      return matched.map((m) => Number(m)).filter((n) => Number.isInteger(n) && n > 0);
    };

    // Collect all bug ids from all rows, preserving first-seen order
    const seen = new Set();
    const extractedOrdered = [];
    for (const row of tcRows) {
      // depending on sequelize config, row may be object or string; handle both
      const cell = typeof row === "object" ? row.bug_ids : row;
      const idsFromCell = parseBugIdsCell(cell);
      for (const id of idsFromCell) {
        if (!seen.has(id)) {
          seen.add(id);
          extractedOrdered.push(id);
        }
      }
    }

    if (extractedOrdered.length === 0) {
      return res.json({
        requestedTestcaseIds: tcArr,
        extractedBugIds: [],
        bugs: [],
        notFound: [],
        message: "No bug_ids found for provided testcaseIds",
      });
    }

    // enforce a max cap for safety
    const MAX_IDS = 100;
    if (extractedOrdered.length > MAX_IDS) {
      extractedOrdered.splice(MAX_IDS);
    }

    // Build placeholders for bug ids
    const placeholders = extractedOrdered.map(() => "?").join(",");

    // 2) Fetch bug details (MySQL-specific aggregation)
    const query = `
      SELECT
        a.bug_id,
        a.priority,
        a.bug_severity,
        a.bug_status,
        a.creation_ts,
        a.delta_ts,
        a.resolution,
        a.lastdiffed,
        MAX(b.short_desc) AS short_desc,
        GROUP_CONCAT(DISTINCT b.comments SEPARATOR '\n\n') AS comments,
        GROUP_CONCAT(DISTINCT b.comments_noprivate SEPARATOR '\n\n') AS comments_noprivate,
        assigned_to_profile.userid AS assigned_userid,
        assigned_to_profile.login_name AS assigned_to_name,
        assigned_to_profile.realname AS assigned_to_realname,
        reporter_profile.userid AS reporter_userid,
        reporter_profile.login_name AS reporter_name,
        reporter_profile.realname AS reporter_realname,
        CASE
          WHEN a.resolution IS NOT NULL THEN DATEDIFF(a.delta_ts, a.creation_ts)
          ELSE NULL
        END AS days_to_resolve
      FROM bugzilla.bugs a
      JOIN bugzilla.bugs_fulltext b ON a.bug_id = b.bug_id
      JOIN bugzilla.profiles assigned_to_profile ON a.assigned_to = assigned_to_profile.userid
      JOIN bugzilla.profiles reporter_profile ON a.reporter = reporter_profile.userid
      WHERE a.bug_id IN (${placeholders})
      GROUP BY a.bug_id
      ORDER BY a.bug_id;
    `;

    const [rows] = await sequelize.query(query, {
      replacements: extractedOrdered,
    });

    // Keep response order matching extractedOrdered
    const rowsById = new Map(rows.map((r) => [Number(r.bug_id), r]));
    const orderedBugs = extractedOrdered.map((id) => rowsById.get(id) || null);

    res.json({
      requestedTestcaseIds: tcArr,
      extractedBugIds: extractedOrdered,
      bugs: orderedBugs.filter(Boolean),
      notFound: orderedBugs.map((r, i) => (r ? null : extractedOrdered[i])).filter(Boolean),
    });
  } catch (err) {
    console.error("Error in GET /bugzilla/bugs/testcase:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});




router.get("/testcaseByRunId", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 1000,
      sortBy = "a.bug_id",
      sortOrder = "ASC",
      download = null,
      sendMail = null,
      runId = 0,
      ...filters
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClauses = [];
    const params = [];

    // -------- FILTERS --------
    if (filters.priority) {
      whereClauses.push("a.priority = ?");
      params.push(filters.priority);
    }
    if (filters.bugid) {
      whereClauses.push("a.bug_id = ?");
      params.push(filters.bugid);
    }
    if (filters.severity) {
      whereClauses.push("a.bug_severity = ?");
      params.push(filters.severity);
    }
    if (filters.status) {
      whereClauses.push("a.bug_status = ?");
      params.push(filters.status);
    }
    if (filters.reporter) {
      whereClauses.push("reporter_profile.login_name = ?");
      params.push(filters.reporter);
    }
    if (filters.assignedTo) {
      whereClauses.push("assigned_to_profile.login_name = ?");
      params.push(filters.assignedTo);
    }
    if (filters.search) {
      whereClauses.push("(b.short_desc LIKE ? OR b.comments LIKE ?)");
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    // Date filters
    if (filters.fromDate && filters.toDate) {
      whereClauses.push("a.creation_ts BETWEEN ? AND ?");
      params.push(filters.fromDate, filters.toDate);
    } else if (filters.fromDate) {
      whereClauses.push("a.creation_ts >= ?");
      params.push(filters.fromDate);
    } else if (filters.toDate) {
      whereClauses.push("a.creation_ts <= ?");
      params.push(filters.toDate);
    }
    if (filters.greaterThanDate) {
      whereClauses.push("a.creation_ts > ?");
      params.push(filters.greaterThanDate);
    }

    const whereSQL = whereClauses.length ? "AND " + whereClauses.join(" AND ") : "";

    // -------- RUN ID VALIDATION --------
    const tcArr = String(runId)
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    if (tcArr.length === 0) {
      return res.status(400).json({ error: "No valid numeric runId found in query parameter 'runId'" });
    }

    if (tcArr.length > 100) {
      return res.status(400).json({ error: "Too many runIds; max 100 allowed" });
    }

    const tcPlaceholders = tcArr.map(() => "?").join(",");

    // -------- 1) COLLECT ALL BUG IDS FROM EXECUTIONS --------
    const selectBugIdsQuery = `
      SELECT bug_ids
      FROM rapr_test_automation.testcase_executions
      WHERE run_id IN (${tcPlaceholders})
        AND bug_ids IS NOT NULL
        AND bug_ids <> '[]';
    `;

    const [tcRows] = await sequelize.query(selectBugIdsQuery, {
      replacements: tcArr,
    });

    const parseBugIdsCell = (cell) => {
      if (!cell) return [];
      const s = String(cell);
      const matched = s.match(/\d+/g);
      return matched ? matched.map(Number).filter((n) => n > 0) : [];
    };

    // flatten + deduplicate all bug IDs
    const seen = new Set();
    const allBugIds = [];
    for (const row of tcRows) {
      const cell = typeof row === "object" ? row.bug_ids : row;
      const ids = parseBugIdsCell(cell);
      for (const id of ids) {
        if (!seen.has(id)) {
          seen.add(id);
          allBugIds.push(id);
        }
      }
    }

    if (allBugIds.length === 0) {
      return res.json({
        runIds: tcArr,
        extractedBugIds: [],
        bugs: [],
        notFound: [],
        message: "No bug_ids found for provided runIds",
      });
    }

    const MAX_IDS = 500;
    if (allBugIds.length > MAX_IDS) {
      allBugIds.splice(MAX_IDS);
    }

    const placeholders = allBugIds.map(() => "?").join(",");

    // -------- 2) FETCH BUG DETAILS WITH FILTERS APPLIED --------
    const query = `
      SELECT
        a.bug_id,
        a.priority,
        a.bug_severity,
        a.bug_status,
        a.creation_ts,
        a.delta_ts,
        a.resolution,
        a.lastdiffed,
        MAX(b.short_desc) AS short_desc,
        assigned_to_profile.userid AS assigned_userid,
        assigned_to_profile.login_name AS assigned_to_name,
        assigned_to_profile.realname AS assigned_to_realname,
        reporter_profile.userid AS reporter_userid,
        reporter_profile.login_name AS reporter_name,
        reporter_profile.realname AS reporter_realname,
        CASE
          WHEN a.resolution IS NOT NULL THEN DATEDIFF(a.delta_ts, a.creation_ts)
          ELSE NULL
        END AS days_to_resolve
      FROM bugzilla.bugs a
      JOIN bugzilla.bugs_fulltext b ON a.bug_id = b.bug_id
      JOIN bugzilla.profiles assigned_to_profile ON a.assigned_to = assigned_to_profile.userid
      JOIN bugzilla.profiles reporter_profile ON a.reporter = reporter_profile.userid
      WHERE a.bug_id IN (${placeholders})
      ${whereSQL}
      GROUP BY a.bug_id
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ${limit} OFFSET ${offset};
    `;

    const [rows] = await sequelize.query(query, {
      replacements: [...allBugIds, ...params],
    });

    // Maintain consistent order with bug ID extraction
    const rowsById = new Map(rows.map((r) => [Number(r.bug_id), r]));
    const orderedBugs = allBugIds.map((id) => rowsById.get(id) || null);

    res.json({
      runIds: tcArr,
      extractedBugIds: allBugIds,
      bugs: orderedBugs.filter(Boolean),
      notFound: orderedBugs.map((r, i) => (r ? null : allBugIds[i])).filter(Boolean),
      total: rows.length,
    });
  } catch (err) {
    console.error("Error in GET /bugzilla/bugs/testcaseByRunId:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

  return router;
};
