// routes/testCases.js
const express = require('express');

module.exports = function (sequelize) {
  const router = express.Router();

  const ALLOWED_SORT = new Set([
    'tc_sid','tc_id','projectId','ts_sid','ts_id','tc_type','status','spoc','createdAt','updatedAt'
  ]);
  function resolveSort(sortBy, sortDir) {
    if (!ALLOWED_SORT.has(sortBy)) sortBy = 'createdAt';
    sortDir = (sortDir && String(sortDir).toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    return { sortBy, sortDir };
  }

  /**
   * GET /api/testcases
   * Filters: q (search tc_id/tc_description/remarks/bug_id/spoc), projectId, ts_sid, ts_id, tc_type, status, spoc
   * Pagination: limit (default 25, max 5000), offset
   * Sorting: sortBy, sortDir
   * includeDeleted=true to include soft-deleted rows
   * includeScenario=true to join and include parent scenario minimal fields (ts_id, uc_sid, uc_id)
   */
  router.get('/', async (req, res) => {
    try {
      const {
        q,
        projectId,
        ts_sid,
        ts_id,
        tc_id,
        tc_type,
        status,
        spoc,
        createdFrom,
        createdTo,
        module,
        limit = 25,
        offset = 0,
        sortBy = 'createdAt',
        sortDir = 'DESC',
        includeDeleted = 'false',
        includeScenario = 'true',
        buildId,
        intent,
        priority
      } = req.query;

console.log('buildId=============>', buildId);

      const { sortBy: col, sortDir: dir } = resolveSort(sortBy, sortDir);

      let where = 'WHERE 1=1';
      const replacements = [];

      if (includeDeleted !== 'true') where += ' AND tc.deletedAt IS NULL';

      if (projectId !== undefined && projectId !== '') {
        where += ' AND tc.projectId = ?';
        replacements.push(Number(projectId));
      }

      if (ts_sid !== undefined && ts_sid !== '') {
        where += ' AND tc.ts_sid = ?';
        replacements.push(Number(ts_sid));
      }

      if (ts_id) {
        where += ' AND tc.ts_id = ?';
        replacements.push(ts_id);
      }

      if (intent) {
        where += ' AND tc.intent = ?';
        replacements.push(intent);
      }

      if (priority) {
        where += ' AND tc.priority = ?';
        replacements.push(priority);
      }
if (buildId !== undefined || tc_id !== undefined) {
  // Support both single and comma-separated tc_id inputs
  const ids = String(tc_id || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (buildId !== undefined && buildId !== '') {
    console.log('buildId=====build========>', buildId);

    // Fetch ts_id CSV from runs table for the given build
    const sql = `SELECT tc_id FROM runs WHERE id = ?`;
    const rows = await sequelize.query(sql, {
      type: sequelize.QueryTypes.SELECT,
      replacements: [buildId],
    });

    if (!rows.length || !rows[0].tc_id) {
      // ✅ No rows found → return empty result
      console.log(`No testcases found for buildId=${buildId}`);
      return res.json({ data: [], total: 0 });
    }

    const tcIdCsv = rows[0].tc_id; // e.g., "TS_01,TS_02,TS_03"
    where += ` AND FIND_IN_SET(tc.tc_id, ?) > 0`;
    replacements.push(tcIdCsv);

  } else if (ids.length === 1) {
    where += ' AND tc.tc_id = ?';
    replacements.push(ids[0]);

  } else if (ids.length > 1) {
    const placeholders = ids.map(() => '?').join(',');
    where += ` AND tc.tc_id IN (${placeholders})`;
    replacements.push(...ids);
  }

}


      if (tc_type) {
        where += ' AND tc.tc_type = ?';
        replacements.push(tc_type);
      }

      if (status) {
        where += ' AND tc.status = ?';
        replacements.push(status);
      }

      if (spoc) {
        where += ' AND tc.spoc = ?';
        replacements.push(spoc);
      }

      if (q) {
        const safeQ = String(q).replace(/[%_]/g, '\\$&');
        where += ' AND (tc.tc_id LIKE ? OR tc.tc_description LIKE ? OR tc.remarks LIKE ? OR tc.bug_id LIKE ? OR tc.spoc LIKE ?)';
        replacements.push(`%${safeQ}%`, `%${safeQ}%`, `%${safeQ}%`, `%${safeQ}%`, `%${safeQ}%`);
      }

      if (createdFrom) {
        where += ' AND tc.createdAt >= ?';
        replacements.push(createdFrom);
      }

      if (module) {
        where += ' AND sc.module = ?';
        replacements.push(module);
      }

      if (createdTo) {
        where += ' AND tc.createdAt <= ?';
        replacements.push(createdTo);
      }

      

      const lim = Math.min(Number(limit) || 25, 5000);
      const off = Math.max(Number(offset) || 0, 0);

      const includeScenarioFlag = includeScenario === 'true';
      let selectCols = includeScenarioFlag
        ? `tc.*, sc.ts_id AS parent_ts_id, sc.uc_sid AS parent_uc_sid, sc.uc_id AS parent_uc_id ,sc.module,sc.ts_description`
        : `tc.*`;

      const joinClause = includeScenarioFlag
        ? `LEFT JOIN TestCaseScenarios sc ON tc.ts_id = sc.ts_id`
        : ``;

      let sql = '';
        
     if (buildId !== undefined && buildId !== '') {
  const tceJoinClause = includeScenarioFlag
    ? `
      LEFT JOIN (
        SELECT te.*
        FROM testcase_executions te
        INNER JOIN (
          SELECT testcase_id, MAX(created_at) AS latest_createdAt
          FROM testcase_executions
          WHERE run_id = ${Number(buildId)}
          GROUP BY testcase_id
        ) latest
          ON te.testcase_id = latest.testcase_id
          AND te.created_at = latest.latest_createdAt
        WHERE te.run_id = ${Number(buildId)}
      ) tce
        ON tc.tc_sid = tce.testcase_id
        AND tce.projectId = tc.projectId
    `
    : ``;

  sql = `
    SELECT ${selectCols}, tce.execution_state, tce.cycle_number,tce.execution_id,tce.updated_at AS execution_updated_at
    FROM TestCases tc
    ${joinClause}
    ${tceJoinClause}
    ${where}
    ORDER BY ${col} ${dir}
    LIMIT ? OFFSET ?;
  `;
}
else{
            sql = `
        SELECT ${selectCols}
        FROM TestCases tc
        ${joinClause}
        ${where}
        ORDER BY ${col} ${dir}
        LIMIT ? OFFSET ?;
      `;
        }
       
     
      const finalReplacements = replacements.concat([lim, off]);

      const rows = await sequelize.query(sql, { replacements: finalReplacements, type: sequelize.QueryTypes.SELECT });     
      const items = Array.isArray(rows) ? rows : [];
      
      // total count for meta (reuse where without limit/offset)
      const countSql = `SELECT COUNT(*) AS total FROM TestCases tc ${joinClause} ${where};`;
      const countReplacements = replacements.slice(0);
      const countRows = await sequelize.query(countSql, { replacements: countReplacements, type: sequelize.QueryTypes.SELECT });
      const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

      // parse JSON fields
      const parsed = items.map(r => {
        try { if (r.tc_data) r.tc_data = (r.tc_data); } catch(e){}
        try { if (r.expected_results) r.expected_results = (r.expected_results); } catch(e){}
        try { if (r.actual_result) r.actual_result = (r.actual_result); } catch(e){}
        try { if (r.tracability) r.tracability = (r.tracability); } catch(e){}
        try { if (r.testers) r.testers = (r.testers); } catch(e){}
        return r;
      });

      return res.json({
        meta: { total, limit: lim, offset: off },
        items: parsed
      });
    } catch (err) {
      console.error('Error GET /api/testcases:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });


  // GET /api/testcases/counts -> KPI counts (totals and by status)
  router.get('/counts', async (req, res) => {
    try {
      // you can extend to group by status if required
      const sql = `
        SELECT
          (SELECT COUNT(*) FROM TestCases) AS total,
          (SELECT COUNT(*) FROM TestCases WHERE deletedAt IS NULL) AS active,
          (SELECT COUNT(*) FROM TestCases WHERE deletedAt IS NOT NULL) AS deleted
      ;`;
      const rows = await sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
      return res.json(rows[0] || { total:0, active:0, deleted:0 });
    } catch (err) {
      console.error('Error GET /api/testcases/counts:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // GET /api/testcases/:id  (includeScenario=true optionally)
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { includeScenario = 'false' } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });

      const includeScenarioFlag = includeScenario === 'true';
      const selectCols = includeScenarioFlag
        ? `tc.*, sc.ts_id AS parent_ts_id, sc.uc_sid AS parent_uc_sid, sc.uc_id AS parent_uc_id`
        : `tc.*`;
      const joinClause = includeScenarioFlag
        ? `LEFT JOIN TestCaseScenarios sc ON tc.ts_sid = sc.ts_sid`
        : '';

      const sql = `
        SELECT ${selectCols}
        FROM TestCases tc
        ${joinClause}
        WHERE tc.tc_sid = ?
        LIMIT 1;
      `;
      const [rows] = await sequelize.query(sql, { replacements: [Number(id)], type: sequelize.QueryTypes.SELECT });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row) return res.status(404).json({ error: 'TestCase not found' });

      try { if (row.tc_data) row.tc_data = (row.tc_data); } catch(e){}
      try { if (row.expected_results) row.expected_results = (row.expected_results); } catch(e){}
      try { if (row.actual_result) row.actual_result = (row.actual_result); } catch(e){}
      try { if (row.tracability) row.tracability = (row.tracability); } catch(e){}
      try { if (row.testers) row.testers = (row.testers); } catch(e){}

      return res.json(row);
    } catch (err) {
      console.error('Error GET /api/testcases/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // POST /api/testcases
  router.post('/', async (req, res) => {
    try {
      const {
        projectId, ts_sid, ts_id, tc_id, tc_description, tc_type,
        prerequisites, steps, tc_data, expected_results, actual_result,
        spoc, status, pot_link, bug_id, Iteration, remarks, count, tracability, testers, 
        priority, intent
      } = req.body;

      if (!projectId) return res.status(400).json({ error: 'projectId is required' });
      if (!tc_id) return res.status(400).json({ error: 'tc_id is required' });

      const tcDataJson = tc_data ? (tc_data) : null;
      const expectedJson = expected_results ? (expected_results) : null;
      const actualJson = actual_result ? (actual_result) : null;
      const tracJson = tracability ? (tracability) : null;
      const testersJson = testers ? (testers) : null;
      const priorityValue = priority ? priority : null;
      const intentValue = intent ? (intent) : null;


      const sql = `
        INSERT INTO TestCases
          (projectId, ts_sid, ts_id, tc_id, tc_description, tc_type, prerequisites, steps,
           tc_data, expected_results, actual_result, spoc, status, pot_link, bug_id, Iteration, remarks, count, tracability, testers, createdAt, updatedAt, priority, intent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(),? ,?);
      `;

      const replacements = [
        Number(projectId),
        ts_sid !== undefined && ts_sid !== null ? Number(ts_sid) : null,
        ts_id || null,
        tc_id,
        tc_description || null,
        tc_type || null,
        prerequisites || null,
        steps || null,
        tcDataJson,
        expectedJson,
        actualJson,
        spoc || null,
        status || null,
        pot_link || null,
        bug_id || null,
        Iteration || null,
        remarks || null,
        count || null,
        tracJson,
        testersJson,
        priorityValue,
        intentValue
      ];

      const [insertRes] = await sequelize.query(sql, { replacements });
      const insertId = insertRes && insertRes.insertId ? insertRes.insertId : insertRes;

      const [rows] = await sequelize.query(`SELECT * FROM TestCases WHERE tc_sid = ? LIMIT 1`, { replacements: [insertId], type: sequelize.QueryTypes.SELECT });
      const created = Array.isArray(rows) ? rows[0] : rows;
      try { if (created.tc_data) created.tc_data = (created.tc_data); } catch(e){}
      try { if (created.expected_results) created.expected_results = (created.expected_results); } catch(e){}
      try { if (created.actual_result) created.actual_result = (created.actual_result); } catch(e){}
      try { if (created.tracability) created.tracability = (created.tracability); } catch(e){}
      try { if (created.testers) created.testers = (created.testers); } catch(e){}

      return res.status(201).json(created);
    } catch (err) {
      console.error('Error POST /api/testcases:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // PUT /api/testcases/:id
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });

      const fields = [];
      const replacements = [];

      if (payload.projectId !== undefined) { fields.push('projectId = ?'); replacements.push(Number(payload.projectId)); }
      if (payload.ts_sid !== undefined) { fields.push('ts_sid = ?'); replacements.push(payload.ts_sid !== null ? Number(payload.ts_sid) : null); }
      if (payload.ts_id !== undefined) { fields.push('ts_id = ?'); replacements.push(payload.ts_id !== null ? payload.ts_id : null); }
      if (payload.tc_id !== undefined) { fields.push('tc_id = ?'); replacements.push(payload.tc_id); }
      if (payload.tc_description !== undefined) { fields.push('tc_description = ?'); replacements.push(payload.tc_description); }
      if (payload.tc_type !== undefined) { fields.push('tc_type = ?'); replacements.push(payload.tc_type); }
      if (payload.prerequisites !== undefined) { fields.push('prerequisites = ?'); replacements.push(payload.prerequisites); }
      if (payload.steps !== undefined) { fields.push('steps = ?'); replacements.push(payload.rawSteps); }
      if (payload.tc_data !== undefined) { fields.push('tc_data = ?'); replacements.push((payload.tc_data)); }
      if (payload.expected_results !== undefined) { fields.push('expected_results = ?'); replacements.push((payload.expected_results)); }
      if (payload.actual_result !== undefined) { fields.push('actual_result = ?'); replacements.push(payload.actual_result); }
      if (payload.spoc !== undefined) { fields.push('spoc = ?'); replacements.push(payload.spoc); }
      if (payload.status !== undefined) { fields.push('status = ?'); replacements.push(payload.status); }
      if (payload.pot_link !== undefined) { fields.push('pot_link = ?'); replacements.push(payload.pot_link); }
      if (payload.bug_id !== undefined) { fields.push('bug_id = ?'); replacements.push(payload.bug_id); }
      if (payload.Iteration !== undefined) { fields.push('Iteration = ?'); replacements.push(payload.Iteration); }
      if (payload.remarks !== undefined) { fields.push('remarks = ?'); replacements.push(payload.remarks); }
      if (payload.count !== undefined) { fields.push('count = ?'); replacements.push(payload.count); }
      if (payload.tracability !== undefined) { fields.push('tracability = ?'); replacements.push((payload.tracability)); }
      if (payload.testers !== undefined) { fields.push('testers = ?'); replacements.push((payload.testers)); }

       if (payload.priority !== undefined) { fields.push('priority = ?'); replacements.push((payload.priority)); }
        if (payload.intent !== undefined) { fields.push('intent = ?'); replacements.push((payload.intent)); }

      if (fields.length === 0) return res.status(400).json({ error: 'no updatable fields provided' });

      fields.push('updatedAt = NOW()');

      const sql = `UPDATE TestCases SET ${fields.join(', ')} WHERE tc_sid = ? AND deletedAt IS NULL;`;
      replacements.push(Number(id));

      const [updateRes] = await sequelize.query(sql, { replacements });

      const updated = await sequelize.query(`SELECT * FROM TestCases WHERE tc_sid = ? LIMIT 1`, { replacements: [Number(id)], type: sequelize.QueryTypes.SELECT });
      //const updated = Array.isArray(rows) ? rows[0] : rows;
      if (!updated) return res.status(404).json({ error: 'TestCase not found or deleted' });

      try { if (updated.tc_data) updated.tc_data = (updated.tc_data); } catch(e){}
      try { if (updated.expected_results) updated.expected_results = (updated.expected_results); } catch(e){}
      try { if (updated.actual_result) updated.actual_result = (updated.actual_result); } catch(e){}
      try { if (updated.tracability) updated.tracability = (updated.tracability); } catch(e){}
      try { if (updated.testers) updated.testers = (updated.testers); } catch(e){}

      return res.json(updated);
    } catch (err) {
      console.error('Error PUT /api/testcases/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // DELETE (soft) /api/testcases/:id
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id required' });

      const sql = `UPDATE TestCases SET deletedAt = NOW() WHERE tc_sid = ? AND deletedAt IS NULL;`;
      const [result] = await sequelize.query(sql, { replacements: [Number(id)] });
      const affected = result && (result.affectedRows || result.affectedRows === 0 ? result.affectedRows : (result.affectedRows === undefined ? 1 : 0));
      if (!affected) return res.status(404).json({ error: 'TestCase not found or already deleted' });

      return res.json({ success: true });
    } catch (err) {
      console.error('Error DELETE /api/testcases/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // DELETE hard /api/testcases/:id/hard
  router.delete('/:id/hard', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id required' });

      const sql = `DELETE FROM TestCases WHERE tc_sid = ?;`;
      const [result] = await sequelize.query(sql, { replacements: [Number(id)] });
      const affected = result && (result.affectedRows || result.affectedRows === 0 ? result.affectedRows : (result.affectedRows === undefined ? 1 : 0));
      if (!affected) return res.status(404).json({ error: 'TestCase not found' });

      return res.json({ success: true });
    } catch (err) {
      console.error('Error DELETE HARD /api/testcases/:id/hard:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // GET /api/testcases/export/csv
  router.get('/export/csv', async (req, res) => {
    try {
      const {
        q,
        projectId,
        ts_sid,
        ts_id,
        tc_id,
        tc_type,
        status,
        spoc,
        createdFrom,
        createdTo,
        includeDeleted = 'false'
      } = req.query;

      let where = 'WHERE 1=1';
      const replacements = [];
      if (includeDeleted !== 'true') where += ' AND deletedAt IS NULL';
      if (projectId) { where += ' AND projectId = ?'; replacements.push(Number(projectId)); }
      if (ts_sid) { where += ' AND ts_sid = ?'; replacements.push(Number(ts_sid)); }
      if (ts_id) { where += ' AND ts_id = ?'; replacements.push(ts_id); }
      if (tc_id) { where += ' AND tc_id = ?'; replacements.push(tc_id); }
      if (tc_type) { where += ' AND tc_type = ?'; replacements.push(tc_type); }
      if (status) { where += ' AND status = ?'; replacements.push(status); }
      if (spoc) { where += ' AND spoc = ?'; replacements.push(spoc); }
      if (q) {
        const safeQ = String(q).replace(/[%_]/g, '\\$&');
        where += ' AND (tc_id LIKE ? OR tc_description LIKE ? OR remarks LIKE ? OR bug_id LIKE ? OR spoc LIKE ?)';
        replacements.push(`%${safeQ}%`, `%${safeQ}%`, `%${safeQ}%`, `%${safeQ}%`, `%${safeQ}%`);
      }
      if (createdFrom) { where += ' AND createdAt >= ?'; replacements.push(createdFrom); }
      if (createdTo) { where += ' AND createdAt <= ?'; replacements.push(createdTo); }

      const sql = `
        SELECT tc_sid, projectId, ts_sid, ts_id, tc_id, tc_description, tc_type, prerequisites, steps, tc_data, expected_results, actual_result, spoc, status, pot_link, bug_id, Iteration, remarks, count, tracability, testers, createdAt, updatedAt, deletedAt
        FROM TestCases
        ${where}
        ORDER BY createdAt DESC
        LIMIT 20000; -- guard
      `;
      const [rows] = await sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
      const items = Array.isArray(rows) ? rows : [];

      // stream CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="testcases_export_${Date.now()}.csv"`);

      res.write('tc_sid,projectId,ts_sid,ts_id,tc_id,tc_description,tc_type,prerequisites,steps,tc_data,expected_results,actual_result,spoc,status,pot_link,bug_id,Iteration,remarks,count,tracability,testers,createdAt,updatedAt,deletedAt\n');
      for (const r of items) {
        const tc_data = r.tc_data ? (r.tc_data).replace(/"/g, '""') : '';
        const expected = r.expected_results ? (r.expected_results).replace(/"/g, '""') : '';
        const actual = r.actual_result ? (r.actual_result).replace(/"/g, '""') : '';
        const trac = r.tracability ? (r.tracability).replace(/"/g, '""') : '';
        const testers = r.testers ? (r.testers).replace(/"/g, '""') : '';

        const line = [
          r.tc_sid,
          r.projectId,
          r.ts_sid,
          `"${String(r.ts_id || '').replace(/"/g, '""')}"`,
          `"${String(r.tc_id || '').replace(/"/g, '""')}"`,
          `"${String(r.tc_description || '').replace(/"/g, '""')}"`,
          `"${String(r.tc_type || '').replace(/"/g, '""')}"`,
          `"${String(r.prerequisites || '').replace(/"/g, '""')}"`,
          `"${String(r.steps || '').replace(/"/g, '""')}"`,
          `"${tc_data}"`,
          `"${expected}"`,
          `"${actual}"`,
          `"${String(r.spoc || '').replace(/"/g, '""')}"`,
          `"${String(r.status || '').replace(/"/g, '""')}"`,
          `"${String(r.pot_link || '').replace(/"/g, '""')}"`,
          `"${String(r.bug_id || '').replace(/"/g, '""')}"`,
          `"${String(r.Iteration || '').replace(/"/g, '""')}"`,
          `"${String(r.remarks || '').replace(/"/g, '""')}"`,
          `"${String(r.count || '').replace(/"/g, '""')}"`,
          `"${trac}"`,
          `"${testers}"`,
          r.createdAt ? `"${r.createdAt}"` : '',
          r.updatedAt ? `"${r.updatedAt}"` : '',
          r.deletedAt ? `"${r.deletedAt}"` : ''
        ].join(',') + '\n';
        res.write(line);
      }
      res.end();
    } catch (err) {
      console.error('Error GET /api/testcases/export/csv:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  return router;
};
