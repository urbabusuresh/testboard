const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

module.exports = function (sequelize) {
  const router = express.Router();

  // Setup multer for file upload
  const upload = multer({
    dest: "uploads/",
    limits: { fileSize: 100 * 1024 * 1024 }, // 10MB
  });

  // -----------------------------
  // 🧩 Upload Excel sheet API
  // -----------------------------
  router.post("/upload-excel", upload.single("file"), async (req, res) => {
    const { project_id, uploadedBy } = req.body;
    const unique_upload_id = `UPLOAD_${Date.now()}`;

    const excelDateToJSDate = (excelDate) => {
  // Excel serial -> JS Date
  if (!excelDate) return null;
  const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
  const yyyy = jsDate.getFullYear();
  const mm = String(jsDate.getMonth() + 1).padStart(2, "0");
  const dd = String(jsDate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

let automationInserted = 0;
    if (!req.file) {
      return res.status(400).json({ error: "No Excel file uploaded" });
    }

    if (!project_id) {
      return res.status(400).json({ error: "Missing project_id" });
    }

    try {
      const filePath = path.resolve(req.file.path);
      const workbook = xlsx.readFile(filePath);
      const sheetNames = workbook.SheetNames;

      let scenariosInserted = 0;
      let testcasesInserted = 0;

      for (const sheetName of sheetNames) {
        const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
        
        if (!sheet.length) continue;

        // Identify which sheet it is
        if (sheetName.toLowerCase().includes("scenario")) {
          // Insert into raw_test_scenarios_upload
          const values = sheet.map((r) => [
            project_id,
            unique_upload_id,
            sheetName,
            r["UseCase ID"] || null,
            r["Test Scenario ID"] || null,
            r["Test Scenario Description"] || null,
            r["Scenario Type"] || null,
            r["Remarks"] || null,
            r["Prepared By"] || null,
            r["Preparation Effort"] || null,
            r["Total Scenario"] || null,
            r["Tracability (SRS)"] || null,
            r["Tracability (SAD)"] || null,
            r["Module"] || null,
            r["Functionality"] || null,
            uploadedBy || null,
          ]);

          const sql = `
            INSERT INTO raw_test_scenarios_upload (
              project_id, unique_upload_id, sheet_name, usecase_id, ts_id, description,
              scenario_type, remarks, prepared_by, preparation_effort, total_scenario,
              tracability_srs, tracability_sad, module_name, functionality, uploadedBy
            )
            VALUES ${values.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",")}
          `;
           
          await sequelize.query(sql, { replacements: values.flat() });
          scenariosInserted += values.length;
        }

        else if (sheetName.toLowerCase().includes("test_case") || sheetName.toLowerCase().includes("test_cases_cons")) {
          // Insert into raw_test_cases_upload
          const values = sheet.map((r) => [
            project_id,
            unique_upload_id,
            sheetName,
            r["Test Case ID"] || null,
            r["Test Case Description"] || null,
            r["Test Scenario ID"] || null,
            r["Test Type"] || null,
            r["Prerequisites"] || null,
            r["Steps for Execution"] || null,
            r["Test Case Data"] || null,
            r["Expected Results"] || null,
            r["Actual Result"] || null,
            r["Status"] || null,
            r["Remarks"] || null,
            r["Tracability"] || null,
            r["Date"] || null,
            r["SPOC"] || null,
            uploadedBy || null,
          ]);

          const sql = `
            INSERT INTO raw_test_cases_upload (
              project_id, unique_upload_id, sheet_name, test_case_id, description, ts_id,
              test_type, prerequisites, steps, test_data, expected_results, actual_result,
              status, remarks, tracability, date, spoc, uploadedBy
            )
            VALUES ${values.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",")}
          `;

          await sequelize.query(sql, { replacements: values.flat() });
          testcasesInserted += values.length;
        }
        else if (sheetName.toLowerCase().includes("automation")) {
    // Insert into raw_automation_test_cases
    const values = sheet.map((r) => [
        project_id,
        unique_upload_id,
        sheetName,
         r["Module"] || null,
        r["Test Scenario ID"] ||r["Test_Scenario_ID"]|| null,
        r["Test Case ID"] || r["Test_Case_Id"]|| null,
        r["Automation ID"] || r["Automation_Id"]|| null,
        r["Description"] || null,
        r["Code File Name"] ||r["Code_File_Name"]|| null,
        r["Plan Start Date"] || excelDateToJSDate(r["Plan_Start_Date"])||null,
        r["Plan End Date"] || excelDateToJSDate(r["Plan_End_Date"])|| null,
        r["Actual Start Date"] ||excelDateToJSDate(r["Actual_Start_Date"])|| null,
        r["Actual End Date"] || excelDateToJSDate(r["Actual_End_Date"])|| null,
        r["Code Status"] || r["Code_Status"]|| null,
        r["Spoc"] || null,
    ]);

    const sql = `
        INSERT INTO raw_automation_test_cases (
            projectId, runId,sheetName,module, Test_Scenario_ID, Test_Case_Id, Automation_Id,
            Description, Code_File_Name, Plan_Start_Date, Plan_End_Date,
            Actual_Start_Date, Actual_End_Date, Code_Status, Spoc
        )
        VALUES ${values.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",")}
    `;
    await sequelize.query(sql, { replacements: values.flat() });
    automationInserted = values.length;
}

      }

      fs.unlinkSync(filePath); // cleanup

      return res.json({
        success: true,
        message: "Excel upload processed successfully",
        unique_upload_id,
        scenariosInserted,
        testcasesInserted,
        automationInserted
      });
    } catch (err) {
      console.error("Error processing Excel:", err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // -----------------------------
  // 🧩 Get uploaded records
  // -----------------------------
  router.get("/uploads", async (req, res) => {
    try {
      const { project_id, limit = 100 } = req.query;
      const sql = `
        SELECT unique_upload_id, COUNT(*) AS total_records, sheet_name,
               MIN(created_at) AS upload_time
        FROM (
          SELECT unique_upload_id, sheet_name, created_at FROM raw_test_scenarios_upload
          UNION ALL
          SELECT unique_upload_id, sheet_name, created_at FROM raw_test_cases_upload
        ) AS uploads
        ${project_id ? "WHERE project_id = ?" : ""}
        GROUP BY unique_upload_id, sheet_name
        ORDER BY upload_time DESC
        LIMIT ?;
      `;
      const replacements = project_id ? [Number(project_id), Number(limit)] : [Number(limit)];
      const rows = await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  

router.post("/sync-raw-to-main", async (req, res) => {
  const { project_id, unique_upload_id } = req.body;

  if (!project_id || !unique_upload_id) {
    return res.status(400).json({ error: "Missing project_id or unique_upload_id" });
  }

  try {
    // ------------------------------
    // 1️⃣ Fetch raw data arrays
    // ------------------------------
    const [rawModules] = await sequelize.query(
      `SELECT DISTINCT module_name FROM raw_test_scenarios_upload
       WHERE project_id=? AND unique_upload_id=? AND module_name IS NOT NULL`,
      { replacements: [project_id, unique_upload_id] }
    );

    const [rawUsecases] = await sequelize.query(
      `SELECT * FROM raw_test_scenarios_upload
       WHERE project_id=? AND unique_upload_id=? AND description IS NULL`,
      { replacements: [project_id, unique_upload_id] }
    );

    const [rawScenarios] = await sequelize.query(
      `SELECT * FROM raw_test_scenarios_upload
       WHERE project_id=? AND unique_upload_id=? AND description IS NOT NULL
       AND scenario_type IN ('positive','negative')`,
      { replacements: [project_id, unique_upload_id] }
    );

    const [rawCases] = await sequelize.query(
      `SELECT * FROM raw_test_cases_upload
       WHERE project_id=? AND unique_upload_id=?`,
      { replacements: [project_id, unique_upload_id] }
    );

    if (!rawScenarios.length && !rawCases.length) {
      return res.status(404).json({ error: "No raw data found for given upload ID" });
    }

    // ------------------------------
    // 2️⃣ Prepare lookup maps
    // ------------------------------
    const moduleMap = {};   // module_name → tm_id
    const usecaseMap = {};  // usecase_id → uc_sid
    const scenarioMap = {}; // ts_id → ts_sid

    let modulesAdded = 0,
        usecasesAdded = 0,
        scenariosAdded = 0,
        testcasesAdded = 0,
        modulesUpdated = 0,
        usecasesUpdated = 0,
        scenariosUpdated = 0,
        testcasesUpdated = 0;

    // ------------------------------
    // 3️⃣ Upsert MODULES
    // ------------------------------
    for (const r of rawModules) {
      const moduleName = r.module_name?.trim();
      if (!moduleName) continue;

      const [existing] = await sequelize.query(
        `SELECT tm_id FROM testmodules WHERE projectId=? AND module=?`,
        { replacements: [project_id, moduleName] }
      );

      if (existing.length) {
        // UPDATE existing
        await sequelize.query(
          `UPDATE testmodules SET description=? WHERE tm_id=?`,
          { replacements: [r.functionality || "", existing[0].tm_id] }
        );
        moduleMap[moduleName] = existing[0].tm_id;
        modulesUpdated++;
      } else {
        // INSERT new
        const [result] = await sequelize.query(
          `INSERT INTO testmodules (projectId, module, description, status)
           VALUES (?, ?, ?, 1)`,
          { replacements: [project_id, moduleName, r.functionality || ""] }
        );
        moduleMap[moduleName] = result;
        modulesAdded++;
      }
    }

    // ------------------------------
    // 4️⃣ Upsert USECASES
    // ------------------------------
    for (const r of rawUsecases) {
      const usecaseId = r.usecase_id?.trim();
      const moduleName = r.module_name?.trim();
      if (!usecaseId) continue;

      const [existing] = await sequelize.query(
        `SELECT uc_sid FROM testusecases WHERE projectId=? AND uc_id=?`,
        { replacements: [project_id, usecaseId] }
      );

      if (existing.length) {
        // UPDATE existing
        await sequelize.query(
          `UPDATE testusecases SET tm_id=?, uc_name=?, module=? WHERE uc_sid=?`,
          {
            replacements: [moduleMap[moduleName], usecaseId, moduleName, existing[0].uc_sid],
          }
        );
        usecaseMap[usecaseId] = existing[0].uc_sid;
        usecasesUpdated++;
      } else {
        // INSERT new
        const [result] = await sequelize.query(
          `INSERT INTO testusecases (projectId, tm_id, uc_id, uc_name, module, status)
           VALUES (?, ?, ?, ?, ?, 'Active')`,
          { replacements: [project_id, moduleMap[moduleName], usecaseId, usecaseId, moduleName] }
        );
        usecaseMap[usecaseId] = result;
        usecasesAdded++;
      }
    }

    // ------------------------------
    // 5️⃣ Upsert SCENARIOS
    // ------------------------------
    for (const r of rawScenarios) {
      const ts_id = r.ts_id?.trim();
      const usecaseId = r.usecase_id?.trim();
      const moduleName = r.module_name?.trim();
      if (!ts_id) continue;

      const [existing] = await sequelize.query(
        `SELECT ts_sid FROM testcasescenarios WHERE projectId=? AND ts_id=?`,
        { replacements: [project_id, ts_id] }
      );

      if (existing.length) {
        // UPDATE existing
        await sequelize.query(
          `UPDATE testcasescenarios SET
             uc_sid=?, ts_description=?, ts_type=?, remarks=?, testers=?, preparation_effort=?, module=?
           WHERE ts_sid=?`,
          {
            replacements: [
              usecaseMap[usecaseId],
              r.description || "",
              r.scenario_type || "",
              r.remarks || "",
              JSON.stringify([{ name: r.prepared_by }]),
              r.preparation_effort || "",
              moduleName,
              existing[0].ts_sid,
            ],
          }
        );
        scenarioMap[ts_id] = existing[0].ts_sid;
        scenariosUpdated++;
      } else {
        // INSERT new
        const [result] = await sequelize.query(
          `INSERT INTO testcasescenarios (
            projectId, uc_sid, ts_id, ts_description, ts_type, remarks,
            testers, preparation_effort, module
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              project_id,
              usecaseMap[usecaseId],
              ts_id,
              r.description || "",
              r.scenario_type || "",
              r.remarks || "",
              JSON.stringify([{ name: r.prepared_by }]),
              r.preparation_effort || "",
              moduleName,
            ],
          }
        );
        scenarioMap[ts_id] = result;
        scenariosAdded++;
      }
    }

    // ------------------------------
    // 6️⃣ Upsert TEST CASES
    // ------------------------------
    for (const r of rawCases) {
      const tc_id = r.test_case_id?.trim();
      const ts_id = r.ts_id?.trim();
      if (!tc_id) continue;

      const [existing] = await sequelize.query(
        `SELECT tc_sid FROM testcases WHERE projectId=? AND tc_id=?`,
        { replacements: [project_id, tc_id] }
      );

      if (existing.length) {
        // UPDATE existing
        await sequelize.query(
          `UPDATE testcases SET
             ts_sid=?, ts_id=?, tc_description=?, tc_type=?, prerequisites=?,
             steps=?, tc_data=?, expected_results=?, actual_result=?, spoc=?, status=?, remarks=?
           WHERE tc_sid=?`,
          {
            replacements: [
              scenarioMap[ts_id] || null,
              ts_id,
              r.description || "",
              r.test_type || "",
              r.prerequisites || "",
              r.steps || "",
              r.test_data || "",
              r.expected_results || "",
              r.actual_result || "",
              r.spoc || "",
              r.status || "Active",
              r.remarks || "",
              existing[0].tc_sid,
            ],
          }
        );
        testcasesUpdated++;
      } else {
        // INSERT new
        await sequelize.query(
          `INSERT INTO testcases (
            projectId, ts_sid, ts_id, tc_id, tc_description, tc_type, prerequisites,
            steps, tc_data, expected_results, actual_result, spoc, status, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              project_id,
              scenarioMap[ts_id] || null,
              ts_id,
              tc_id,
              r.description || "",
              r.test_type || "",
              r.prerequisites || "",
              r.steps || "",
              r.test_data || "",
              r.expected_results || "",
              r.actual_result || "",
              r.spoc || "",
              r.status || "Active",
              r.remarks || "",
            ],
          }
        );
        testcasesAdded++;
      }
    }

    return res.json({
      success: true,
      message: "Raw data synced to main tables successfully",
      modulesAdded,
      modulesUpdated,
      usecasesAdded,
      usecasesUpdated,
      scenariosAdded,
      scenariosUpdated,
      testcasesAdded,
      testcasesUpdated,
    });

  } catch (err) {
    console.error("Error syncing raw data:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});



  // -----------------------------
  // 🧩 Sync raw data to main tables (UPSERT)
  // -----------------------------
  router.post("/sync-main", async (req, res) => {
    const { project_id, unique_upload_id } = req.body;
    if (!project_id || !unique_upload_id) {
      return res.status(400).json({ error: "Missing project_id or unique_upload_id" });
    }

    try {
      // -----------------------------
      // 1️⃣ Upsert MODULES
      // -----------------------------
      await sequelize.query(`
        INSERT INTO testmodules (projectId, module, description, status)
        SELECT DISTINCT project_id, module_name, IFNULL(functionality, ''), 1
        FROM raw_test_scenarios_upload
        WHERE project_id = ? AND unique_upload_id = ? AND module_name IS NOT NULL
        ON DUPLICATE KEY UPDATE description = VALUES(description), status = 1
      `, { replacements: [project_id, unique_upload_id] });

      // -----------------------------
      // 2️⃣ Upsert USECASES
      // -----------------------------
      await sequelize.query(`
        INSERT INTO testusecases (projectId, tm_id, uc_id, uc_name,uc_description, module, status)
        SELECT 
          r.project_id,
          m.tm_id,
          r.usecase_id,
          r.ts_id,
          r.ts_id,
          r.module_name,
          'Active'
        FROM raw_test_scenarios_upload r
        JOIN testmodules m
          ON m.projectId = r.project_id 
        WHERE r.project_id = ? AND r.unique_upload_id = ? AND r.description IS NULL
        ON DUPLICATE KEY UPDATE
          tm_id = VALUES(tm_id),
          uc_name = VALUES(uc_name),
          module = VALUES(module)
      `, { replacements: [project_id, unique_upload_id] });

      // -----------------------------
      // 3️⃣ Upsert SCENARIOS
      // -----------------------------
      await sequelize.query(`
        INSERT INTO testcasescenarios (
          projectId, uc_sid,uc_id ,ts_id, ts_description, ts_type, remarks, testers, preparation_effort, module
        )
        SELECT 
          r.project_id,
          u.uc_sid,
          u.uc_id,
          r.ts_id,
          r.description,
          r.scenario_type,
          r.remarks,
          JSON_OBJECT('name', r.prepared_by),
          r.preparation_effort,
          r.module_name
        FROM raw_test_scenarios_upload r
        JOIN testusecases u
          ON u.projectId = r.project_id AND u.uc_id = r.usecase_id
        WHERE r.project_id = ? AND r.unique_upload_id = ? AND r.description IS NOT NULL
          AND r.scenario_type IN ('positive','negative')
        ON DUPLICATE KEY UPDATE
          uc_sid = VALUES(uc_sid),
           uc_id = VALUES(uc_id),
          ts_description = VALUES(ts_description),
          ts_type = VALUES(ts_type),
          remarks = VALUES(remarks),
          testers = VALUES(testers),
          preparation_effort = VALUES(preparation_effort),
          module = VALUES(module)
      `, { replacements: [project_id, unique_upload_id] });

      // -----------------------------
      // 4️⃣ Upsert TEST CASES
      // -----------------------------
      await sequelize.query(`
        INSERT INTO testcases (
          projectId, ts_sid, ts_id, tc_id, tc_description, tc_type, prerequisites,
          steps, tc_data, expected_results, actual_result, spoc, status, remarks
        )
        SELECT 
          r.project_id,
          s.ts_sid,
          r.ts_id,
          r.test_case_id,
          r.description,
          r.test_type,
          r.prerequisites,
          r.steps,
          r.test_data,
          r.expected_results,
          r.actual_result,
          r.spoc,
          r.status,
          r.remarks
        FROM raw_test_cases_upload r
        JOIN testcasescenarios s
          ON s.projectId = r.project_id AND r.ts_id  COLLATE utf8mb4_0900_ai_ci = s.ts_id COLLATE utf8mb4_0900_ai_ci
          
        WHERE r.project_id = ? AND r.unique_upload_id = ?
        ON DUPLICATE KEY UPDATE
          ts_sid = VALUES(ts_sid),
          tc_description = VALUES(tc_description),
          tc_type = VALUES(tc_type),
          prerequisites = VALUES(prerequisites),
          steps = VALUES(steps),
          tc_data = VALUES(tc_data),
          expected_results = VALUES(expected_results),
          actual_result = VALUES(actual_result),
          spoc = VALUES(spoc),
          status = VALUES(status),
          remarks = VALUES(remarks)
      `, { replacements: [project_id, unique_upload_id] });






      return res.json({
        success: true,
        message: "Raw data synced to main tables successfully using UPSERT SQL!",
      });

    } catch (err) {
      console.error("Error syncing raw data:", err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });



// inside module.exports function — replace your upload-excel handler with this:
router.post("/upload-excel-new", upload.single("file"), async (req, res) => {
  const { project_id, uploadedBy } = req.body;
  const unique_upload_id = `UPLOAD_${Date.now()}`;

  if (!req.file) return res.status(400).json({ error: "No Excel file uploaded" });
  if (!project_id) return res.status(400).json({ error: "Missing project_id" });

  const filePath = path.resolve(req.file.path);
  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath);

  const SCENARIO_BATCH = 400; // tune this to your DB capacity
  const CASE_BATCH = 400;

  let scenarioBuffer = [];
  let caseBuffer = [];
  let scenariosInserted = 0;
  let testcasesInserted = 0;

  async function flushScenarioBuffer() {
    if (!scenarioBuffer.length) return;
    // build multi-row placeholders and replacements
    const placeholders = scenarioBuffer.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
    const sql = `
      INSERT INTO raw_test_scenarios_upload (
        project_id, unique_upload_id, sheet_name, usecase_id, ts_id, description,
        scenario_type, remarks, prepared_by, preparation_effort, total_scenario,
        tracability_srs, tracability_sad, module_name, functionality, uploadedBy
      ) VALUES ${placeholders}
    `;
    const replacements = scenarioBuffer.flat();
    await sequelize.query(sql, { replacements });
    scenariosInserted += scenarioBuffer.length;
    scenarioBuffer = [];
  };

  async function flushCaseBuffer  () {
    if (!caseBuffer.length) return;
    const placeholders = caseBuffer.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
    const sql = `
      INSERT INTO raw_test_cases_upload (
        project_id, unique_upload_id, sheet_name, test_case_id, description, ts_id,
        test_type, prerequisites, steps, test_data, expected_results, actual_result,
        status, remarks, tracability, date, spoc, uploadedBy
      ) VALUES ${placeholders}
    `;
    const replacements = caseBuffer.flat();
    await sequelize.query(sql, { replacements });
    testcasesInserted += caseBuffer.length;
    caseBuffer = [];
  };

  try {
    // read streaming
    for await (const worksheetReader of workbookReader) {
      const sheetName = worksheetReader.name || "Sheet";
      // We'll read rows one by one
      for await (const row of worksheetReader) {
        // ExcelJS returns row.values as array with index starting at 1
        // translate based on your column layout — adjust indexes if needed
        // Example mapping assuming known columns order:
        // row.values[1] is first cell, etc.
        // But better is to read header row first and map by header text.
        if (row.number === 1) {
          // capture header -> column index mapping
          const headers = {};
          row.eachCell((cell, colNumber) => {
            const key = String((cell.text || cell.value || "")).trim();
            headers[key] = colNumber;
          });
          // store headers for this worksheet for subsequent rows
          worksheetReader._headers = headers;
          continue;
        }

        const hdr = worksheetReader._headers || {};

        // Determine whether this row is "scenario" or "testcase" based on sheetName or headers
        const isScenarioSheet = sheetName.toLowerCase().includes("scenario")||sheetName.toLowerCase().includes("scenarios")||sheetName.toLowerCase().includes("test scenarios")||sheetName.toLowerCase().includes("testscenarios");
        const isTestcaseSheet =sheetName.toLowerCase().includes("testcases")||sheetName.toLowerCase().includes("test cases")||sheetName.toLowerCase().includes("test_case") || sheetName.toLowerCase().includes("test_cases_cons");

        if (isScenarioSheet) {
          // map values by header name — safe fallback to empty string
          const get = (colName) => {
            const idx = hdr[colName];
            return idx ? String(row.getCell(idx).text || "").trim() : "";
          };

          const values = [
            project_id,
            unique_upload_id,
            sheetName,
            get("UseCase ID") || null,
            get("Test Scenario ID") || null,
            get("Test Scenario Description") || null,
            get("Scenario Type") || null,
            get("Remarks") || null,
            get("Prepared By") || null,
            get("Preparation Effort") || null,
            get("Total Scenario") || null,
            get("Tracability (SRS)") || null,
            get("Tracability (SAD)") || null,
            get("Module") || null,
            get("Functionality") || null,
            uploadedBy || null,
          ];

          scenarioBuffer.push(values);
          if (scenarioBuffer.length >= SCENARIO_BATCH) {
            await flushScenarioBuffer();
          }
        } else if (isTestcaseSheet) {
          const get = (colName) => {
            const idx = hdr[colName];
            return idx ? String(row.getCell(idx).text || "").trim() : "";
          };

          const values = [
            project_id,
            unique_upload_id,
            sheetName,
            get("Test Case ID") || null,
            get("Test Case Description") || null,
            get("Test Scenario ID") || null,
            get("Test Type") || null,
            get("Prerequisites") || null,
            get("Steps for Execution") || null,
            get("Test Case Data") || null,
            get("Expected Results") || null,
            get("Actual Result") || null,
            get("Status") || null,
            get("Remarks") || null,
            get("Tracability") || null,
            get("Date") || null,
            get("SPOC") || null,
            uploadedBy || null,
          ];

          caseBuffer.push(values);
          if (caseBuffer.length >= CASE_BATCH) {
            await flushCaseBuffer();
          }
        } else {
          // unknown sheet type — skip or treat as appropriate
        }
      } // end rows loop
      // flush per sheet
      await flushScenarioBuffer();
      await flushCaseBuffer();
    } // end worksheets loop

    // cleanup file
    try { fs.unlinkSync(filePath); } catch(e){/* ignore */ }

    return res.json({
      success: true,
      message: "Excel upload processed successfully (streamed)",
      unique_upload_id,
      scenariosInserted,
      testcasesInserted,
    });
  } catch (err) {
    // ensure buffers flushed on error? you may still flush or rollback depending on need
    console.error("Error processing Excel (stream):", err);
    try { fs.unlinkSync(filePath); } catch(e){/* ignore */ }
    return res.status(500).json({ error: String(err.message || err) });
  }
});

// -----------------------------
// 🧩 Sync Automation Test Cases (UPDATE first, then INSERT new)
// -----------------------------
router.post("/sync-automation", async (req, res) => {
  const { project_id, unique_upload_id } = req.body;
  if (!project_id || !unique_upload_id) {
    return res.status(400).json({ error: "Missing project_id or unique_upload_id" });
  }

  const t = await sequelize.transaction(); // start transaction
  try {
    // -----------------------------
    // 1️⃣ UPDATE existing automation test cases first
    // -----------------------------
    await sequelize.query(`
      UPDATE autotestcases a
      JOIN raw_automation_test_cases r
        ON a.autc_id = r.Automation_Id
      SET
        a.module = r.Module,
        a.tsc_id = r.Test_Scenario_ID,
        a.tc_id = r.Test_Case_Id,
        a.description = r.Description,
       a.plan_start_date = STR_TO_DATE(r.Plan_Start_Date, '%Y-%m-%d') ,
       a.plan_end_date   = STR_TO_DATE(r.Plan_End_Date, '%Y-%m-%d') ,
        a.testfilename = r.Code_File_Name,
        a.created_by = 'admin'
      WHERE r.projectId = ? AND r.runId = ?
    `, { replacements: [project_id, unique_upload_id], transaction: t });

    // -----------------------------
    // 2️⃣ INSERT new automation test cases that do not exist
    // -----------------------------
    await sequelize.query(`
      INSERT INTO autotestcases (
        module,projectid, tsc_id, tc_id, autc_id, description, plan_start_date, plan_end_date, testfilename, created_by
      )
      SELECT
        r.Module,
        r.projectId,
        r.Test_Scenario_ID,
        r.Test_Case_Id,
        r.Automation_Id,
        r.Description,
        STR_TO_DATE(NULLIF(r.Plan_Start_Date, now()), '%Y-%m-%d'),
        STR_TO_DATE(NULLIF(r.Plan_End_Date, now()), '%Y-%m-%d'),
        r.Code_File_Name,
        'admin'
      FROM raw_automation_test_cases r
      LEFT JOIN autotestcases a
        ON a.autc_id = r.Automation_Id
      WHERE a.autc_id IS NULL
        AND r.projectId = ? AND r.runId = ?
    `, { replacements: [project_id, unique_upload_id], transaction: t });

    await t.commit();

    return res.json({
      success: true,
      message: "Automation test cases synced successfully (updated existing and inserted new)."
    });

  } catch (err) {
    await t.rollback();
    console.error("Error syncing automation tests:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});
// -----------------------------
// 🧩 Convert and Update Steps to TinyMCE HTML Format (safe, idempotent)
// -----------------------------
router.post("/convert-steps-to-tinymce", async (req, res) => {
  try {
    const { project_id, limit = 1000, dryRun = false } = req.body;

    // Fetch steps from DB
    const sql = `
      SELECT tc_sid, steps
      FROM rapr_test_automation.testcases
      ${project_id ? "WHERE projectId = ?" : ""}
      LIMIT ?;
    `;
    const replacements = project_id ? [project_id, Number(limit)] : [Number(limit)];

    const rows = await sequelize.query(sql, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    if (!rows.length) {
      return res.status(404).json({ message: "No testcases found with steps." });
    }

    let updatedCount = 0;
    let skippedHTML = 0;
    let skippedEmpty = 0;

    for (const row of rows) {
      const { tc_sid, steps } = row;
      if (!steps || !steps.trim()) {
        skippedEmpty++;
        continue;
      }

      // If already looks like TinyMCE/HTML, skip
      if (/<(ol|ul|li|p|div|span|br|strong|em|a)[^>]*>/i.test(steps)) {
        skippedHTML++;
        continue;
      }

      const htmlSteps = convertStepsToHTML(steps);
      if (!htmlSteps) continue;

      if (!dryRun) {
        // Backup old steps before overwriting
        await sequelize.query(
          `UPDATE rapr_test_automation.testcases
           SET steps = ?
           WHERE tc_sid = ?`,
          { replacements: [htmlSteps, tc_sid] }
        );
      }

      updatedCount++;
    }

    res.json({
      success: true,
      message: "Steps converted to TinyMCE format successfully",
      updatedCount,
      skippedHTML,
      skippedEmpty,
      dryRun,
    });

  } catch (err) {
    console.error("Error converting steps to TinyMCE:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

// ----------------------------------
// Helper: Convert plain text to HTML (safe & smart)
// ----------------------------------
function convertStepsToHTML(plainText) {
  if (!plainText) return "";

  // Normalize line breaks & clean JSON fragments / noise
  let cleaned = plainText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/(\{[\s\S]*?\})/g, "<pre>$1</pre>") // preserve inline JSON safely
    .trim();

  const lines = cleaned
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (!lines.length) return "";

  let html = "<ol>";
  let subList = [];
  let currentItemOpen = false;

  for (let line of lines) {
    // Handle numbered steps like "1." or "Step 1:"
    if (/^(\d+\.|\s*Step\s*\d+:?)/i.test(line)) {
      // Close previous item
      if (currentItemOpen) {
        if (subList.length) {
          html += "<ul>" + subList.map(li => `<li>${li}</li>`).join("") + "</ul>";
          subList = [];
        }
        html += "</li>";
      }

      const stepText = line.replace(/^(\d+\.|\s*Step\s*\d+:?)/i, "").trim();
      html += `<li>${sanitizeText(stepText)}`;
      currentItemOpen = true;

    } else if (/^[•\-*]/.test(line)) {
      // Bullet sub-step
      const sub = line.replace(/^[•\-*]\s*/, "");
      subList.push(sanitizeText(sub));

    } else if (/^https?:\/\//i.test(line)) {
      // Handle plain links
      subList.push(`<a href="${line}" target="_blank">${line}</a>`);

    } else if (line.startsWith("{") && line.endsWith("}")) {
      // Inline JSON block
      subList.push(`<pre>${escapeHTML(line)}</pre>`);

    } else {
      // Fallback paragraph
      subList.push(sanitizeText(line));
    }
  }

  // Close any remaining items
  if (currentItemOpen) {
    if (subList.length) {
      html += "<ul>" + subList.map(li => `<li>${li}</li>`).join("") + "</ul>";
    }
    html += "</li>";
  }

  html += "</ol>";

  return html;
}

// ----------------------------------
// Utility: Sanitize text (safe for HTML)
// ----------------------------------
function sanitizeText(text) {
  if (!text) return "";
  return escapeHTML(text)
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ----------------------------------
// Utility: Escape HTML special chars
// ----------------------------------
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/**
 * 🔄 Sync 'module' field in testusecases with grouped modules from testcasescenarios
 * 🧩 Works only for the given projectId
 * 
 * Example call:
 * POST /api/sync-modules
 * Body: { "projectId": 101 }
 */

router.post("/sync-modules", async (req, res) => {
  const { projectId } = req.body;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: "❌ Missing required field: projectId",
    });
  }

  try {
    // ✅ 1️⃣ Update existing testusecases for this project
    const updateQuery = `
      UPDATE testusecases AS tuc
      INNER JOIN (
          SELECT 
              tcs.uc_id,
              GROUP_CONCAT(DISTINCT tcs.module ORDER BY tcs.module SEPARATOR ', ') AS module
          FROM 
              testcasescenarios AS tcs
          WHERE tcs.projectId = :projectId
          GROUP BY tcs.uc_id
      ) AS sub
        ON tuc.uc_id COLLATE utf8mb4_unicode_ci = sub.uc_id COLLATE utf8mb4_unicode_ci
      SET tuc.module = sub.module
      WHERE tuc.projectId = :projectId;
    `;

    const [updateResult] = await sequelize.query(updateQuery, {
      replacements: { projectId },
      type: sequelize.QueryTypes.UPDATE,
    });

    // ✅ 2️⃣ Insert missing uc_id entries for this project
    const insertQuery = `
      INSERT INTO testusecases (projectId, uc_id, module)
      SELECT 
          tcs.projectId,
          tcs.uc_id,
          GROUP_CONCAT(DISTINCT tcs.module ORDER BY tcs.module SEPARATOR ', ') AS module
      FROM 
          testcasescenarios AS tcs
      LEFT JOIN testusecases AS tuc
          ON tuc.uc_id COLLATE utf8mb4_unicode_ci = tcs.uc_id COLLATE utf8mb4_unicode_ci
          AND tuc.projectId = tcs.projectId
      WHERE tcs.projectId = :projectId
        AND tuc.uc_id IS NULL
      GROUP BY tcs.projectId, tcs.uc_id;
    `;

    const [insertResult] = await sequelize.query(insertQuery, {
      replacements: { projectId },
      type: sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({
      success: true,
      message: `✅ Module sync completed successfully for projectId ${projectId}.`,
      details: {
        updatedRows:
          typeof updateResult === "object" && updateResult.affectedRows
            ? updateResult.affectedRows
            : updateResult,
        insertedRows:
          typeof insertResult === "object" && insertResult.affectedRows
            ? insertResult.affectedRows
            : insertResult,
      },
    });
  } catch (err) {
    console.error("❌ Error syncing modules:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to sync modules.",
      error: err.message,
    });
  }
});

return router;
};