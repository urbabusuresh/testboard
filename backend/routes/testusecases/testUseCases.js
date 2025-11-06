// routes/testUseCases.js
const express = require('express');

module.exports = function (sequelize) {
  const router = express.Router();

  const ALLOWED_SORT = new Set(['uc_sid', 'uc_id', 'uc_name', 'projectId', 'tm_id', 'rd_id', 'status', 'createdAt', 'updatedAt','module']);
  function resolveSort(sortBy, sortDir) {
    if (!ALLOWED_SORT.has(sortBy)) sortBy = 'createdAt';
    sortDir = (sortDir && String(sortDir).toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    return { sortBy, sortDir };
  }

  // GET /api/testusecases
  // Filters: q (search on uc_id/uc_name/uc_description), projectId, tm_id, rd_id, status
  // Pagination: limit, offset
  // Sort: sortBy, sortDir
  // includeDeleted=true to include soft deleted rows
  router.get('/', async (req, res) => {
    try {
      const {
        q,
        projectId,
        tm_id,
        rd_id,
        status,
        createdFrom,
        createdTo,
        limit = 25,
        offset = 0,
        sortBy = 'createdAt',
        sortDir = 'DESC',
        includeDeleted = 'false',
        module,

      } = req.query;

      const { sortBy: col, sortDir: dir } = resolveSort(sortBy, sortDir);

      let where = 'WHERE 1=1';
      const replacements = [];

      if (includeDeleted !== 'true') {
        where += ' AND tuc.deletedAt IS NULL';
      }

      if (projectId !== undefined && projectId !== '') {
        where += ' AND tuc.projectId = ?';
        replacements.push(Number(projectId));
      }

      if (tm_id !== undefined && tm_id !== '' && tm_id !== 'all') {
        where += ' AND tuc.module IN (?)';
        replacements.push(Number(tm_id));
      }
    
      if (module !== undefined && module !== '' && module !== 'all') {
        where += ' AND tuc.module IN (?)';
        replacements.push(Number(tm_id));
      }

      if (rd_id !== undefined && rd_id !== '') {
        where += ' AND tuc.rd_id = ?';
        replacements.push(Number(rd_id));
      }

      if (status) {
        where += ' AND tuc.status = ?';
        replacements.push(status);
      }

      if (q) {
        const safeQ = String(q).replace(/[%_]/g, '\\$&');
        // search in uc_id, uc_name, uc_description
        where += ' AND (tuc.uc_id LIKE ? OR tuc.uc_name LIKE ? OR tuc.uc_description LIKE ?)';
        replacements.push(`%${safeQ}%`, `%${safeQ}%`, `%${safeQ}%`);
      }

      if (createdFrom) {
        where += ' AND tuc.createdAt >= ?';
        replacements.push(createdFrom);
      }
      if (createdTo) {
        where += ' AND tuc.createdAt <= ?';
        replacements.push(createdTo);
      }

      const lim = Math.min(Number(limit) || 25, 5000); // guard
      const off = Math.max(Number(offset) || 0, 0);

     const sql = `
  SELECT 
    tuc.uc_sid,
    tuc.projectId,
    tuc.tm_id,
    tuc.rd_id,
    tuc.uc_id,
    tuc.uc_name,
    LEFT(tuc.uc_description, 200) AS uc_description,
    tuc.testers,
    tuc.status,
    tuc.tracability,
    tuc.createdAt,
    tuc.updatedAt,
    tuc.deletedAt,
    tuc.module,
    COUNT(DISTINCT tcs.ts_sid) AS scenariosCount,
    COUNT(DISTINCT tc.tc_id) AS testcasesCount
  FROM TestUseCases tuc
  LEFT JOIN TestCaseScenarios tcs
     ON tuc.uc_id COLLATE utf8mb4_unicode_ci = tcs.uc_id COLLATE utf8mb4_unicode_ci
  LEFT JOIN TestCases tc
    ON tcs.ts_id COLLATE utf8mb4_unicode_ci = tc.ts_id COLLATE utf8mb4_unicode_ci
  ${where}
  GROUP BY 
    tuc.uc_sid,
    tuc.projectId,
    tuc.tm_id,
    tuc.rd_id,
    tuc.uc_id,
    tuc.uc_name,
    tuc.uc_description,
    tuc.testers,
    tuc.status,
    tuc.tracability,
    tuc.createdAt,
    tuc.updatedAt,
    tuc.deletedAt,
    tuc.module
  ORDER BY ${col} ${dir}
  LIMIT ? OFFSET ?;
`;

      const finalReplacements = replacements.concat([lim, off]);

      const rows = await sequelize.query(sql, { replacements: finalReplacements, type: sequelize.QueryTypes.SELECT });
      const items = Array.isArray(rows) ? rows : [];

      // get total count for meta (reuse where and replacements without limit/offset)
      const countSql = `SELECT COUNT(*) AS total FROM TestUseCases tuc ${where};`;
      const countReplacements = replacements.slice(0); // copy
      const countRows = await sequelize.query(countSql, { replacements: countReplacements, type: sequelize.QueryTypes.SELECT });
      const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

      // parse JSON fields
      const parsed = items.map(r => {
        try { if (r.testers) r.testers = JSON.parse(r.testers); } catch (e) { /* ignore parse errors */ }
        try { if (r.tracability) r.tracability = JSON.parse(r.tracability); } catch (e) { /* ignore parse errors */ }
        return r;
      });

      return res.json({
        meta: { total, limit: lim, offset: off },
        items: parsed
      });
    } catch (err) {
      console.error('Error GET /api/testusecases:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // GET /api/testusecases/counts -> KPIs
  router.get('/counts', async (req, res) => {
    try {
      const sql = `
        SELECT
          (SELECT COUNT(*) FROM TestUseCases) AS total,
          (SELECT COUNT(*) FROM TestUseCases WHERE deletedAt IS NULL) AS active,
          (SELECT COUNT(*) FROM TestUseCases WHERE deletedAt IS NOT NULL) AS deleted
      ;`;
      const [rows] = await sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
      return res.json(rows[0] || { total: 0, active: 0, deleted: 0 });
    } catch (err) {
      console.error('Error GET /api/testusecases/counts:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // GET /api/testusecases/:id
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id required' });

      const sql = `
        SELECT *
        FROM TestUseCases
        WHERE uc_sid = ?
        LIMIT 1;
      `;
      const [rows] = await sequelize.query(sql, { replacements: [Number(id)], type: sequelize.QueryTypes.SELECT });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row) return res.status(404).json({ error: 'TestUseCase not found' });

      try { if (row.testers) row.testers = JSON.parse(row.testers); } catch(e){}
      try { if (row.tracability) row.tracability = JSON.parse(row.tracability); } catch(e){}

      return res.json(row);
    } catch (err) {
      console.error('Error GET /api/testusecases/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // POST /api/testusecases
  router.post('/', async (req, res) => {
    try {
      const {
        projectId, tm_id, rd_id, uc_id, uc_name, uc_description, testers, status, tracability
      } = req.body;

      if (!projectId) return res.status(400).json({ error: 'projectId is required' });
      if (!uc_id) return res.status(400).json({ error: 'uc_id is required' });

      const testersJson = testers ? JSON.stringify(testers) : null;
      const tracJson = tracability ? JSON.stringify(tracability) : null;

      const sql = `
        INSERT INTO TestUseCases
          (projectId, tm_id, rd_id, uc_id, uc_name, uc_description, testers, status, tracability, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());
      `;
      const replacements = [
        Number(projectId),
        tm_id !== undefined && tm_id !== null ? Number(tm_id) : null,
        rd_id !== undefined && rd_id !== null ? Number(rd_id) : null,
        uc_id,
        uc_name || null,
        uc_description || null,
        testersJson,
        status || null,
        tracJson
      ];

      const [insertRes] = await sequelize.query(sql, { replacements });
      const insertId = insertRes && insertRes.insertId ? insertRes.insertId : insertRes;

      const [rows] = await sequelize.query(`SELECT * FROM TestUseCases WHERE uc_sid = ? LIMIT 1`, { replacements: [insertId], type: sequelize.QueryTypes.SELECT });
      const created = Array.isArray(rows) ? rows[0] : rows;
      try { if (created && created.testers) created.testers = JSON.parse(created.testers); } catch(e){}
      try { if (created && created.tracability) created.tracability = JSON.parse(created.tracability); } catch(e){}

      return res.status(201).json(created);
    } catch (err) {
      console.error('Error POST /api/testusecases:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // PUT /api/testusecases/:id
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });

      const fields = [];
      const replacements = [];

      if (payload.projectId !== undefined) { fields.push('projectId = ?'); replacements.push(Number(payload.projectId)); }
      if (payload.tm_id !== undefined) { fields.push('tm_id = ?'); replacements.push(payload.tm_id !== null ? Number(payload.tm_id) : null); }
      if (payload.rd_id !== undefined) { fields.push('rd_id = ?'); replacements.push(payload.rd_id !== null ? Number(payload.rd_id) : null); }
      if (payload.uc_id !== undefined) { fields.push('uc_id = ?'); replacements.push(payload.uc_id); }
      if (payload.uc_name !== undefined) { fields.push('uc_name = ?'); replacements.push(payload.uc_name); }
      if (payload.uc_description !== undefined) { fields.push('uc_description = ?'); replacements.push(payload.uc_description); }
      if (payload.testers !== undefined) { fields.push('testers = ?'); replacements.push(JSON.stringify(payload.testers)); }
      if (payload.status !== undefined) { fields.push('status = ?'); replacements.push(payload.status); }
      if (payload.tracability !== undefined) { fields.push('tracability = ?'); replacements.push(JSON.stringify(payload.tracability)); }

      if (fields.length === 0) return res.status(400).json({ error: 'no updatable fields provided' });

      fields.push('updatedAt = NOW()');
      const sql = `UPDATE TestUseCases SET ${fields.join(', ')} WHERE uc_sid = ? AND deletedAt IS NULL;`;
      replacements.push(Number(id));

      const [updateRes] = await sequelize.query(sql, { replacements });

      const [rows] = await sequelize.query(`SELECT * FROM TestUseCases WHERE uc_sid = ? LIMIT 1`, { replacements: [Number(id)], type: sequelize.QueryTypes.SELECT });
      const updated = Array.isArray(rows) ? rows[0] : rows;
      if (!updated) return res.status(404).json({ error: 'TestUseCase not found or deleted' });

      try { if (updated.testers) updated.testers = JSON.parse(updated.testers); } catch(e){}
      try { if (updated.tracability) updated.tracability = JSON.parse(updated.tracability); } catch(e){}

      return res.json(updated);
    } catch (err) {
      console.error('Error PUT /api/testusecases/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // DELETE (soft) /api/testusecases/:id
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id required' });

      const sql = `UPDATE TestUseCases SET deletedAt = NOW() WHERE uc_sid = ? AND deletedAt IS NULL;`;
      const [result] = await sequelize.query(sql, { replacements: [Number(id)] });
      const affected = result && (result.affectedRows || result.affectedRows === 0 ? result.affectedRows : (result.affectedRows === undefined ? 1 : 0));
      if (!affected) return res.status(404).json({ error: 'TestUseCase not found or already deleted' });

      return res.json({ success: true });
    } catch (err) {
      console.error('Error DELETE /api/testusecases/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // DELETE hard /api/testusecases/:id/hard
  router.delete('/:id/hard', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id required' });

      const sql = `DELETE FROM TestUseCases WHERE uc_sid = ?;`;
      const [result] = await sequelize.query(sql, { replacements: [Number(id)] });
      const affected = result && (result.affectedRows || result.affectedRows === 0 ? result.affectedRows : (result.affectedRows === undefined ? 1 : 0));
      if (!affected) return res.status(404).json({ error: 'TestUseCase not found' });

      return res.json({ success: true });
    } catch (err) {
      console.error('Error DELETE HARD /api/testusecases/:id/hard:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // GET /api/testusecases/export/csv
  router.get('/export/csv', async (req, res) => {
    try {
      const {
        q,
        projectId,
        tm_id,
        rd_id,
        status,
        createdFrom,
        createdTo,
        includeDeleted = 'false'
      } = req.query;

      let where = 'WHERE 1=1';
      const replacements = [];
      if (includeDeleted !== 'true') where += ' AND deletedAt IS NULL';
      if (projectId) { where += ' AND projectId = ?'; replacements.push(Number(projectId)); }
      if (tm_id) { where += ' AND tm_id = ?'; replacements.push(Number(tm_id)); }
      if (rd_id) { where += ' AND rd_id = ?'; replacements.push(Number(rd_id)); }
      if (status) { where += ' AND status = ?'; replacements.push(status); }
      if (q) {
        const safeQ = String(q).replace(/[%_]/g, '\\$&');
        where += ' AND (uc_id LIKE ? OR uc_name LIKE ? OR uc_description LIKE ?)';
        replacements.push(`%${safeQ}%`, `%${safeQ}%`, `%${safeQ}%`);
      }
      if (createdFrom) { where += ' AND createdAt >= ?'; replacements.push(createdFrom); }
      if (createdTo) { where += ' AND createdAt <= ?'; replacements.push(createdTo); }

      const sql = `
        SELECT uc_sid, projectId, tm_id, rd_id, uc_id, uc_name, uc_description, testers, status, tracability, createdAt, updatedAt, deletedAt
        FROM TestUseCases
        ${where}
        ORDER BY createdAt DESC
        LIMIT 20000; -- guard
      `;
      const [rows] = await sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
      const items = Array.isArray(rows) ? rows : [];

      // stream as CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="testusecases_export_${Date.now()}.csv"`);

      res.write('uc_sid,projectId,tm_id,rd_id,uc_id,uc_name,uc_description,testers,status,tracability,createdAt,updatedAt,deletedAt\n');
      for (const r of items) {
        const testers = r.testers ? JSON.stringify(r.testers).replace(/"/g, '""') : '';
        const trac = r.tracability ? JSON.stringify(r.tracability).replace(/"/g, '""') : '';
        const line = [
          r.uc_sid,
          r.projectId,
          r.tm_id !== null && r.tm_id !== undefined ? r.tm_id : '',
          r.rd_id !== null && r.rd_id !== undefined ? r.rd_id : '',
          `"${String(r.uc_id || '').replace(/"/g, '""')}"`,
          `"${String(r.uc_name || '').replace(/"/g, '""')}"`,
          `"${String(r.uc_description || '').replace(/"/g, '""')}"`,
          `"${testers}"`,
          `"${String(r.status || '')}"`,
          `"${trac}"`,
          r.createdAt ? `"${r.createdAt}"` : '',
          r.updatedAt ? `"${r.updatedAt}"` : '',
          r.deletedAt ? `"${r.deletedAt}"` : ''
        ].join(',') + '\n';
        res.write(line);
      }
      res.end();
    } catch (err) {
      console.error('Error GET /api/testusecases/export/csv:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });


 // GET /api/testusecases/:reqType/:id
router.get('/:reqType/:id', async (req, res) => {
  try {
    const { reqType, id } = req.params;

    if (!id) return res.status(400).json({ error: 'Request ID is required' });
    if (!reqType) return res.status(400).json({ error: 'Request type is required' });

    let sqlExists, sqlMax;

    switch (reqType.toLowerCase()) {
      case 'testusecases':
        sqlExists = `SELECT uc_id FROM rapr_test_automation.testusecases WHERE uc_id = ? LIMIT 1;`;
        sqlMax = `SELECT MAX(CAST(SUBSTRING(uc_id, LOCATE('_', uc_id) + 1) AS UNSIGNED)) AS maxValue FROM rapr_test_automation.testusecases;`;
        break;

      case 'testscenarios':
        sqlExists = `SELECT ts_id FROM rapr_test_automation.testcasescenarios WHERE ts_id = ? LIMIT 1;`;
        sqlMax = `SELECT MAX(CAST(SUBSTRING(ts_id, LOCATE('_', ts_id) + 1) AS UNSIGNED)) AS maxValue FROM rapr_test_automation.testcasescenarios;`;
        break;

      case 'testcases':
        sqlExists = `SELECT tc_id FROM rapr_test_automation.testcases WHERE tc_id = ? LIMIT 1;`;
        sqlMax = `SELECT MAX(CAST(SUBSTRING(tc_id, LOCATE('_', tc_id) + 1) AS UNSIGNED)) AS maxValue FROM rapr_test_automation.testcases;`;
        break;

      

      default:
        return res.status(400).json({ error: 'Invalid request type' });
    }

    // ✅ Check if record exists
    const existsRows = await sequelize.query(sqlExists, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT,
    });

    // ✅ Get max numeric suffix
    // const maxRows = await sequelize.query(sqlMax, {
    //   type: sequelize.QueryTypes.SELECT,
    // });

    const exists = existsRows && existsRows.length > 0;
    //const maxValue = maxRows?.[0]?.maxValue ?? null;

    return res.json({ exists });
  } catch (err) {
    console.error('Error GET /api/testusecases/:reqType/:id:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});



  return router;
};
