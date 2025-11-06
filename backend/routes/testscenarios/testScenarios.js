// routes/testCaseScenarios.js
const express = require('express');

module.exports = function (sequelize) {
  const router = express.Router();

  const ALLOWED_SORT = new Set(['ts_sid', 'ts_id', 'projectId', 'module','uc_sid', 'uc_id', 'ts_type', 'createdAt', 'updatedAt']);
  function resolveSort(sortBy, sortDir) {
    if (!ALLOWED_SORT.has(sortBy)) sortBy = 'createdAt';
    sortDir = (sortDir && String(sortDir).toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    return { sortBy, sortDir };
  }

  /**
   * GET /api/testscenarios
   * Filters:
   *   q (search on ts_id, ts_description, remarks),
   *   projectId, uc_sid, uc_id, ts_id, ts_type
   * Pagination: limit, offset
   * Sorting: sortBy, sortDir
   * includeDeleted=true to include soft deleted rows
   * includeUsecase=true to join and include parent usecase uc_id/uc_name
   */router.get('/', async (req, res) => {
  try {
    const {
      q,
      projectId,
      uc_sid,
      uc_id,
      ts_id,
      module,
      ts_type,
      createdFrom,
      createdTo,
      limit = 25,
      offset = 0,
      sortBy = 'createdAt',
      sortDir = 'DESC',
      includeDeleted = 'false',
      includeUsecase = 'false'
    } = req.query;

    const { sortBy: col, sortDir: dir } = resolveSort(sortBy, sortDir);

    // --- Build WHERE clause dynamically ---
    let where = 'WHERE 1=1';
    const replacements = [];

    if (includeDeleted !== 'true') where += ' AND ts.deletedAt IS NULL';

    if (projectId) {
      where += ' AND ts.projectId = ?';
      replacements.push(Number(projectId));
    }

    if (uc_sid) {
      where += ' AND ts.uc_sid = ?';
      replacements.push(Number(uc_sid));
    }

    if (uc_id) {
      where += ' AND ts.uc_id = ?';
      replacements.push(uc_id);
    }

    if (module) {
      where += ' AND ts.module = ?';
      replacements.push(module);
    }

    if (ts_id) {
      where += ' AND ts.ts_id = ?';
      replacements.push(ts_id);
    }

    if (ts_type) {
      where += ' AND ts.ts_type = ?';
      replacements.push(ts_type);
    }

    if (q) {
      const safeQ = String(q).replace(/[%_]/g, '\\$&');
      where += ` AND (ts.ts_id LIKE ? OR ts.ts_description LIKE ? OR ts.remarks LIKE ?)`;
      replacements.push(`%${safeQ}%`, `%${safeQ}%`, `%${safeQ}%`);
    }

    if (createdFrom) {
      where += ' AND ts.createdAt >= ?';
      replacements.push(createdFrom);
    }
    if (createdTo) {
      where += ' AND ts.createdAt <= ?';
      replacements.push(createdTo);
    }

    const lim = Math.min(Number(limit) || 25, 5000);
    const off = Math.max(Number(offset) || 0, 0);

    // --- Select columns (includeUsecase optional) ---
    const selectCols =
      includeUsecase === 'true'
        ? `
          ts.ts_sid,
          ts.projectId,
          ts.uc_sid,
          ts.ts_id,
          ts.uc_id,
          ts.ts_description,
          ts.ts_type,
          ts.remarks,
          ts.testers,
          ts.preparation_effort,
          ts.tracability,
          ts.createdAt,
          ts.updatedAt,
          ts.deletedAt,
          ts.module,
          uc.uc_name AS parent_uc_name,
          COUNT(tc.ts_id) AS testcase_count
        `
        : `
          ts.ts_sid,
          ts.projectId,
          ts.uc_sid,
          ts.ts_id,
          ts.uc_id,
          ts.ts_description,
          ts.ts_type,
          ts.remarks,
          ts.testers,
          ts.preparation_effort,
          ts.tracability,
          ts.createdAt,
          ts.updatedAt,
          ts.deletedAt,
          ts.module,
          COUNT(tc.ts_id) AS testcase_count
        `;

    // --- Join clause ---
    const joinClause =
      includeUsecase === 'true'
        ? `
          LEFT JOIN TestUseCases uc ON ts.uc_sid = uc.uc_sid
          LEFT JOIN testcases tc ON ts.ts_id = tc.ts_id AND tc.deletedAt IS NULL
        `
        : `
          LEFT JOIN testcases tc ON ts.ts_id = tc.ts_id AND tc.deletedAt IS NULL
        `;

    // --- Main query with GROUP BY for testcase_count ---
    const sql = `
      SELECT ${selectCols}
      FROM TestCaseScenarios ts
      ${joinClause}
      ${where}
      GROUP BY 
        ts.ts_sid, ts.projectId, ts.uc_sid, ts.ts_id, ts.uc_id,
        ts.ts_description, ts.ts_type, ts.remarks, ts.testers,
        ts.preparation_effort, ts.tracability, ts.createdAt,
        ts.updatedAt, ts.deletedAt, ts.module
        ${includeUsecase === 'true' ? ', uc.uc_name' : ''}
      ORDER BY ${col} ${dir}
      LIMIT ? OFFSET ?;
    `;

    const finalReplacements = replacements.concat([lim, off]);

    const rows = await sequelize.query(sql, {
      replacements: finalReplacements,
      type: sequelize.QueryTypes.SELECT,
    });

    // --- Count total scenarios (not affected by LIMIT) ---
    const countSql = `
      SELECT COUNT(*) AS total
      FROM TestCaseScenarios ts
      ${includeUsecase === 'true' ? 'LEFT JOIN TestUseCases uc ON ts.uc_sid = uc.uc_sid' : ''}
      ${where};
    `;
    const countRows = await sequelize.query(countSql, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });
    const total = countRows?.[0]?.total || 0;

    // --- Parse JSON fields safely ---
    const parsed = rows.map((r) => {
      try {
        if (r.testers) r.testers = JSON.parse(r.testers);
      } catch {}
      try {
        if (r.tracability) r.tracability = JSON.parse(r.tracability);
      } catch {}
      return r;
    });

    return res.json({
      meta: { total, limit: lim, offset: off },
      items: parsed,
    });
  } catch (err) {
    console.error('Error GET /api/testscenarios:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});


  // GET /api/testscenarios/counts  -> KPI counts
  router.get('/counts', async (req, res) => {
    try {
      const sql = `
        SELECT
          (SELECT COUNT(*) FROM TestCaseScenarios) AS total,
          (SELECT COUNT(*) FROM TestCaseScenarios WHERE deletedAt IS NULL) AS active,
          (SELECT COUNT(*) FROM TestCaseScenarios WHERE deletedAt IS NOT NULL) AS deleted
      ;`;
      const [rows] = await sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
      return res.json(rows[0] || { total: 0, active: 0, deleted: 0 });
    } catch (err) {
      console.error('Error GET /api/testscenarios/counts:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // GET /api/testscenarios/:id
  // includeUsecase=true optionally returns parent usecase brief info
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { includeUsecase = 'false' } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });

      const selectCols = includeUsecase === 'true'
        ? `ts.*, uc.uc_id AS parent_uc_id, uc.uc_name AS parent_uc_name`
        : `ts.*`;

      const joinClause = includeUsecase === 'true'
        ? 'LEFT JOIN TestUseCases uc ON ts.uc_sid = uc.uc_sid'
        : '';

      const sql = `
        SELECT ${selectCols}
        FROM TestCaseScenarios ts
        ${joinClause}
        WHERE ts.ts_sid = ?
        LIMIT 1;
      `;
      const [rows] = await sequelize.query(sql, { replacements: [Number(id)], type: sequelize.QueryTypes.SELECT });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row) return res.status(404).json({ error: 'TestCaseScenario not found' });

      try { if (row.testers) row.testers = JSON.parse(row.testers); } catch(e){}
      try { if (row.tracability) row.tracability = JSON.parse(row.tracability); } catch(e){}

      return res.json(row);
    } catch (err) {
      console.error('Error GET /api/testscenarios/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // POST /api/testscenarios
  router.post('/', async (req, res) => {
    try {
      const {
        projectId,
        uc_sid,
        ts_id,
        uc_id,
        ts_description,
        ts_type,
        remarks,
        testers,
        preparation_effort,
        tracability,
        module
      } = req.body;

      if (!projectId) return res.status(400).json({ error: 'projectId is required' });
      if (!uc_sid) return res.status(400).json({ error: 'uc_sid is required' });
      if (!ts_id) return res.status(400).json({ error: 'ts_id is required' });

      const testersJson = testers ? JSON.stringify(testers) : null;
      const tracJson = tracability ? JSON.stringify(tracability) : null;

      const sql = `
        INSERT INTO TestCaseScenarios
          (projectId, uc_sid, ts_id, uc_id, ts_description, ts_type, remarks, testers, preparation_effort, tracability, createdAt, updatedAt,module)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(),?);
      `;
      const replacements = [
        Number(projectId),
        Number(uc_sid),
        ts_id,
        uc_id || null,
        ts_description || null,
        ts_type || null,
        remarks || null,
        testersJson,
        preparation_effort || null,
        tracJson,
        module||null
      ];

      const [insertRes] = await sequelize.query(sql, { replacements });
      const insertId = insertRes && insertRes.insertId ? insertRes.insertId : insertRes;

      const [rows] = await sequelize.query(`SELECT * FROM TestCaseScenarios WHERE ts_sid = ? LIMIT 1`, { replacements: [insertId], type: sequelize.QueryTypes.SELECT });
      const created = Array.isArray(rows) ? rows[0] : rows;
      try { if (created && created.testers) created.testers = JSON.parse(created.testers); } catch(e){}
      try { if (created && created.tracability) created.tracability = JSON.parse(created.tracability); } catch(e){}

      return res.status(201).json(created);
    } catch (err) {
      console.error('Error POST /api/testscenarios:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // PUT /api/testscenarios/:id
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });

      const fields = [];
      const replacements = [];

      if (payload.projectId !== undefined) { fields.push('projectId = ?'); replacements.push(Number(payload.projectId)); }
      if (payload.uc_sid !== undefined) { fields.push('uc_sid = ?'); replacements.push(payload.uc_sid !== null ? Number(payload.uc_sid) : null); }
      if (payload.ts_id !== undefined) { fields.push('ts_id = ?'); replacements.push(payload.ts_id); }
      if (payload.uc_id !== undefined) { fields.push('uc_id = ?'); replacements.push(payload.uc_id); }
      if (payload.ts_description !== undefined) { fields.push('ts_description = ?'); replacements.push(payload.ts_description); }
      if (payload.ts_type !== undefined) { fields.push('ts_type = ?'); replacements.push(payload.ts_type); }
      if (payload.remarks !== undefined) { fields.push('remarks = ?'); replacements.push(payload.remarks); }
      if (payload.testers !== undefined) { fields.push('testers = ?'); replacements.push(JSON.stringify(payload.testers)); }
      if (payload.preparation_effort !== undefined) { fields.push('preparation_effort = ?'); replacements.push(payload.preparation_effort); }
      if (payload.tracability !== undefined) { fields.push('tracability = ?'); replacements.push(JSON.stringify(payload.tracability)); }
      if (payload.module !== undefined) { fields.push('module = ?'); replacements.push(payload.module); }
      if (fields.length === 0) return res.status(400).json({ error: 'no updatable fields provided' });

      fields.push('updatedAt = NOW()');
      const sql = `UPDATE TestCaseScenarios SET ${fields.join(', ')} WHERE ts_sid = ? AND deletedAt IS NULL;`;
      replacements.push(Number(id));

      const [updateRes] = await sequelize.query(sql, { replacements });

      const [rows] = await sequelize.query(`SELECT * FROM TestCaseScenarios WHERE ts_sid = ? LIMIT 1`, { replacements: [Number(id)], type: sequelize.QueryTypes.SELECT });
      const updated = Array.isArray(rows) ? rows[0] : rows;
      if (!updated) return res.status(404).json({ error: 'TestCaseScenario not found or deleted' });

      try { if (updated.testers) updated.testers = JSON.parse(updated.testers); } catch(e){}
      try { if (updated.tracability) updated.tracability = JSON.parse(updated.tracability); } catch(e){}

      return res.json(updated);
    } catch (err) {
      console.error('Error PUT /api/testscenarios/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // DELETE (soft) /api/testscenarios/:id
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id required' });

      const sql = `UPDATE TestCaseScenarios SET deletedAt = NOW() WHERE ts_sid = ? AND deletedAt IS NULL;`;
      const [result] = await sequelize.query(sql, { replacements: [Number(id)] });
      const affected = result && (result.affectedRows || result.affectedRows === 0 ? result.affectedRows : (result.affectedRows === undefined ? 1 : 0));
      if (!affected) return res.status(404).json({ error: 'TestCaseScenario not found or already deleted' });

      return res.json({ success: true });
    } catch (err) {
      console.error('Error DELETE /api/testscenarios/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // DELETE hard /api/testscenarios/:id/hard
  router.delete('/:id/hard', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id required' });

      const sql = `DELETE FROM TestCaseScenarios WHERE ts_sid = ?;`;
      const [result] = await sequelize.query(sql, { replacements: [Number(id)] });
      const affected = result && (result.affectedRows || result.affectedRows === 0 ? result.affectedRows : (result.affectedRows === undefined ? 1 : 0));
      if (!affected) return res.status(404).json({ error: 'TestCaseScenario not found' });

      return res.json({ success: true });
    } catch (err) {
      console.error('Error DELETE HARD /api/testscenarios/:id/hard:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // GET /api/testscenarios/export/csv
  router.get('/export/csv', async (req, res) => {
    try {
      const {
        q,
        projectId,
        uc_sid,
        uc_id,
        ts_id,
        ts_type,
        createdFrom,
        createdTo,
        includeDeleted = 'false'
      } = req.query;

      let where = 'WHERE 1=1';
      const replacements = [];
      if (includeDeleted !== 'true') where += ' AND deletedAt IS NULL';
      if (projectId) { where += ' AND projectId = ?'; replacements.push(Number(projectId)); }
      if (uc_sid) { where += ' AND uc_sid = ?'; replacements.push(Number(uc_sid)); }
      if (uc_id) { where += ' AND uc_id = ?'; replacements.push(uc_id); }
      if (ts_id) { where += ' AND ts_id = ?'; replacements.push(ts_id); }
      if (ts_type) { where += ' AND ts_type = ?'; replacements.push(ts_type); }
      if (q) {
        const safeQ = String(q).replace(/[%_]/g, '\\$&');
        where += ' AND (ts_id LIKE ? OR ts_description LIKE ? OR remarks LIKE ?)';
        replacements.push(`%${safeQ}%`, `%${safeQ}%`, `%${safeQ}%`);
      }
      if (createdFrom) { where += ' AND createdAt >= ?'; replacements.push(createdFrom); }
      if (createdTo) { where += ' AND createdAt <= ?'; replacements.push(createdTo); }

      const sql = `
        SELECT ts_sid, projectId, uc_sid, ts_id, uc_id, ts_description, ts_type, remarks, testers, preparation_effort, tracability, createdAt, updatedAt, deletedAt,module
        FROM TestCaseScenarios
        ${where}
        ORDER BY createdAt DESC
        LIMIT 20000; -- guard
      `;
      const [rows] = await sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
      const items = Array.isArray(rows) ? rows : [];

      // stream CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="testscenarios_export_${Date.now()}.csv"`);

      res.write('ts_sid,projectId,uc_sid,ts_id,uc_id,ts_description,ts_type,remarks,testers,preparation_effort,tracability,createdAt,updatedAt,deletedAt\n');
      for (const r of items) {
        const testers = r.testers ? JSON.stringify(r.testers).replace(/"/g, '""') : '';
        const trac = r.tracability ? JSON.stringify(r.tracability).replace(/"/g, '""') : '';
        const line = [
          r.ts_sid,
          r.projectId,
          r.uc_sid,
          `"${String(r.ts_id || '').replace(/"/g, '""')}"`,
          `"${String(r.uc_id || '').replace(/"/g, '""')}"`,
          `"${String(r.ts_description || '').replace(/"/g, '""')}"`,
          `"${String(r.ts_type || '').replace(/"/g, '""')}"`,
          `"${String(r.remarks || '').replace(/"/g, '""')}"`,
          `"${testers}"`,
          `"${String(r.preparation_effort || '').replace(/"/g, '""')}"`,
          `"${trac}"`,
          r.createdAt ? `"${r.createdAt}"` : '',
          r.updatedAt ? `"${r.updatedAt}"` : '',
          r.deletedAt ? `"${r.deletedAt}"` : ''
        ].join(',') + '\n';
        res.write(line);
      }
      res.end();
    } catch (err) {
      console.error('Error GET /api/testscenarios/export/csv:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  return router;
};
