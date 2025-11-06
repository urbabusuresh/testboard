// routes/testmodules.js
const express = require('express');
//const { format } = require('date-fns'); // optional, install if you want formatted dates for CSV

module.exports = function (sequelize) {
  const router = express.Router();

  // Helper: sanitize/validate sort column
  const ALLOWED_SORT = new Set(['tm_id','projectId','module','status','createdAt','updatedAt']);
  function resolveSort(sortBy, sortDir) {
    if (!ALLOWED_SORT.has(sortBy)) sortBy = 'createdAt';
    sortDir = (sortDir && sortDir.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    return { sortBy, sortDir };
  }

  // GET /api/testmodules
  // Filters: q, projectId, status, createdFrom, createdTo
  // Pagination: limit (default 25, max 1000), offset
  // Sorting: sortBy, sortDir
 router.get('/', async (req, res) => {
  try {
    const {
      q,
      projectId,
      status,
      createdFrom,
      createdTo,
      limit = 25,
      offset = 0,
      sortBy = 'createdAt',
      sortDir = 'DESC',
      includeDeleted = 'false'
    } = req.query;

    const { sortBy: col, sortDir: dir } = resolveSort(sortBy, sortDir);

    const replacements = [];
    let where = 'WHERE 1=1';

    if (includeDeleted !== 'true') {
      where += ' AND tm.deletedAt IS NULL';
    }

    if (projectId !== undefined && projectId !== '') {
      where += ' AND tm.projectId = ?';
      replacements.push(Number(projectId));
    }

    if (status) {
      where += ' AND tm.status = ?';
      replacements.push(status);
    }

    if (q) {
      // safe LIKE search on module & description (escape %/_)
      const safeQ = String(q).replace(/[%_]/g, '\\$&');
      where += ' AND (tm.module LIKE ? OR tm.description LIKE ?)';
      replacements.push(`%${safeQ}%`, `%${safeQ}%`);
    }

    if (createdFrom) {
      where += ' AND tm.createdAt >= ?';
      replacements.push(createdFrom);
    }
    if (createdTo) {
      where += ' AND tm.createdAt <= ?';
      replacements.push(createdTo);
    }

    // limit guard
    const lim = Math.min(Number(limit) || 25, 1000);
    const off = Math.max(Number(offset) || 0, 0);

    // ✅ Main query: includes usecase/scenario/testcase counts
    const sql = `
      SELECT 
        tm.tm_id,
        tm.projectId,
        tm.module,
        tm.description,
        tm.testers,
        tm.developers,
        tm.status,
        tm.createdAt,
        tm.updatedAt,
        tm.deletedAt,
        COUNT(DISTINCT tcs.uc_id) AS usecases,
        COUNT(DISTINCT tcs.ts_id) AS scenarios,
        COUNT(DISTINCT tc.tc_id) AS testcases
      FROM testmodules tm
      LEFT JOIN testcasescenarios tcs 
        ON tm.module COLLATE utf8mb4_unicode_ci = tcs.module COLLATE utf8mb4_unicode_ci
      LEFT JOIN testcases tc 
        ON tcs.ts_id = tc.ts_id
      ${where}
      GROUP BY 
        tm.tm_id,
        tm.projectId,
        tm.module,
        tm.description,
        tm.testers,
        tm.developers,
        tm.status,
        tm.createdAt,
        tm.updatedAt,
        tm.deletedAt
      ORDER BY ${col} ${dir}
      LIMIT ? OFFSET ?;
    `;
    replacements.push(lim, off);

    const rows = await sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });

    // ✅ Total count for pagination metadata
    const countSql = `SELECT COUNT(*) AS total FROM testmodules tm ${where};`;
    const countReplacements = replacements.slice(0, Math.max(0, replacements.length - 2));
    const countRows = await sequelize.query(countSql, { replacements: countReplacements, type: sequelize.QueryTypes.SELECT });
    const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

    // ✅ Parse JSON fields safely
    const items = (Array.isArray(rows) ? rows : []).map(r => {
      try { if (r.testers) r.testers = JSON.parse(r.testers); } catch (e) {}
      try { if (r.developers) r.developers = JSON.parse(r.developers); } catch (e) {}
      return r;
    });

    return res.json({
      meta: { total, limit: lim, offset: off },
      items
    });

  } catch (err) {
    console.error('Error GET /api/testmodules:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});


  // GET /api/testmodules/counts  -> KPI counts (total, active, deleted, by status)
  router.get('/counts', async (req, res) => {
    try {
      const sql = `
        SELECT
          (SELECT COUNT(*) FROM testmodules) AS total,
          (SELECT COUNT(*) FROM testmodules WHERE deletedAt IS NULL) AS active,
          (SELECT COUNT(*) FROM testmodules WHERE deletedAt IS NOT NULL) AS deleted
      ;`;
      const [rows] = await sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
      return res.json(rows[0] || { total:0, active:0, deleted:0 });
    } catch (err) {
      console.error('Error GET /api/testmodules/counts:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // GET /api/testmodules/:id
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id required' });

      const sql = `
        SELECT tm_id, projectId, module, description, testers, developers, status, createdAt, updatedAt, deletedAt
        FROM testmodules
        WHERE tm_id = ?
        LIMIT 1;
      `;
      const [rows] = await sequelize.query(sql, { replacements: [Number(id)], type: sequelize.QueryTypes.SELECT });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row) return res.status(404).json({ error: 'Module not found' });

      try { if (row.testers) row.testers = JSON.parse(row.testers); } catch(e){}
      try { if (row.developers) row.developers = JSON.parse(row.developers); } catch(e){}

      return res.json(row);
    } catch (err) {
      console.error('Error GET /api/testmodules/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // POST /api/testmodules
  router.post('/', async (req, res) => {
    try {
      const {
        projectId, module: moduleName, description, testers, developers, status
      } = req.body;

      if (!projectId) return res.status(400).json({ error: 'projectId is required' });
      if (!moduleName) return res.status(400).json({ error: 'module is required' });

      const testersJson = testers ? JSON.stringify(testers) : null;
      const developersJson = developers ? JSON.stringify(developers) : null;

      const sql = `
        INSERT INTO testmodules (projectId, module, description, testers, developers, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW());
      `;
      const replacements = [Number(projectId), moduleName, description || null, testersJson, developersJson, status || null];
      const [resInsert] = await sequelize.query(sql, { replacements });
      const insertId = resInsert && resInsert.insertId ? resInsert.insertId : resInsert;

      // fetch created row
      const [rows] = await sequelize.query(`SELECT * FROM testmodules WHERE tm_id = ? LIMIT 1`, { replacements: [insertId], type: sequelize.QueryTypes.SELECT });
      const created = Array.isArray(rows) ? rows[0] : rows;
      try { if (created && created.testers) created.testers = JSON.parse(created.testers); } catch(e){}
      try { if (created && created.developers) created.developers = JSON.parse(created.developers); } catch(e){}

      return res.status(201).json(created);
    } catch (err) {
      console.error('Error POST /api/testmodules:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // PUT /api/testmodules/:id
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });

      // Build dynamic set clause and replacements
      const fields = [];
      const replacements = [];

      if (payload.projectId !== undefined) { fields.push('projectId = ?'); replacements.push(Number(payload.projectId)); }
      if (payload.module !== undefined) { fields.push('module = ?'); replacements.push(payload.module); }
      if (payload.description !== undefined) { fields.push('description = ?'); replacements.push(payload.description); }
      if (payload.testers !== undefined) { fields.push('testers = ?'); replacements.push(JSON.stringify(payload.testers)); }
      if (payload.developers !== undefined) { fields.push('developers = ?'); replacements.push(JSON.stringify(payload.developers)); }
      if (payload.status !== undefined) { fields.push('status = ?'); replacements.push(payload.status); }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'no updatable fields provided' });
      }

      fields.push('updatedAt = NOW()');
      const sql = `UPDATE testmodules SET ${fields.join(', ')} WHERE tm_id = ? AND deletedAt IS NULL;`;
      replacements.push(Number(id));

      const [updateRes] = await sequelize.query(sql, { replacements });

      // return updated row
      const [rows] = await sequelize.query(`SELECT * FROM testmodules WHERE tm_id = ? LIMIT 1`, { replacements: [Number(id)], type: sequelize.QueryTypes.SELECT });
      const updated = Array.isArray(rows) ? rows[0] : rows;
      if (!updated) return res.status(404).json({ error: 'module not found or deleted' });

      try { if (updated.testers) updated.testers = JSON.parse(updated.testers); } catch(e){}
      try { if (updated.developers) updated.developers = JSON.parse(updated.developers); } catch(e){}

      return res.json(updated);
    } catch (err) {
      console.error('Error PUT /api/testmodules/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // DELETE (soft) /api/testmodules/:id
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id required' });

      const sql = `UPDATE testmodules SET deletedAt = NOW() WHERE tm_id = ? AND deletedAt IS NULL;`;
      const [result] = await sequelize.query(sql, { replacements: [Number(id)] });
      // result.affectedRows may vary depending on driver; handle generically:
      const affected = result && (result.affectedRows || result.affectedRows === 0 ? result.affectedRows : (result.affectedRows === undefined ? 1 : 0));
      if (!affected) return res.status(404).json({ error: 'module not found or already deleted' });

      return res.json({ success: true });
    } catch (err) {
      console.error('Error DELETE /api/testmodules/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // DELETE hard /api/testmodules/:id/hard
  router.delete('/:id/hard', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id required' });

      const sql = `DELETE FROM testmodules WHERE tm_id = ?;`;
      const [result] = await sequelize.query(sql, { replacements: [Number(id)] });
      const affected = result && (result.affectedRows || result.affectedRows === 0 ? result.affectedRows : (result.affectedRows === undefined ? 1 : 0));
      if (!affected) return res.status(404).json({ error: 'module not found' });

      return res.json({ success: true });
    } catch (err) {
      console.error('Error DELETE HARD /api/testmodules/:id/hard:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // GET /api/testmodules/export? ... -> CSV export of list
  // WARNING: for very large datasets run async export job; this is a simple streaming endpoint for moderate sized result sets
  router.get('/export/csv', async (req, res) => {
  try {
    const {
      q, projectId, status, createdFrom, createdTo, includeDeleted = 'false'
    } = req.query;

    const replacements = [];
    let where = 'WHERE 1=1';

    if (includeDeleted !== 'true') where += ' AND tm.deletedAt IS NULL';
    if (projectId) {
      where += ' AND tm.projectId = ?';
      replacements.push(Number(projectId));
    }
    if (status) {
      where += ' AND tm.status = ?';
      replacements.push(status);
    }
    if (q) {
      const safeQ = String(q).replace(/[%_]/g, '\\$&');
      where += ' AND (tm.module LIKE ? OR tm.description LIKE ?)';
      replacements.push(`%${safeQ}%`, `%${safeQ}%`);
    }
    if (createdFrom) {
      where += ' AND tm.createdAt >= ?';
      replacements.push(createdFrom);
    }
    if (createdTo) {
      where += ' AND tm.createdAt <= ?';
      replacements.push(createdTo);
    }

    // ✅ Main export SQL with counts
    const sql = `
      SELECT 
        tm.tm_id,
        tm.projectId,
        tm.module,
        tm.description,
        tm.testers,
        tm.developers,
        tm.status,
        tm.createdAt,
        tm.updatedAt,
        tm.deletedAt,
        COUNT(DISTINCT tcs.uc_id) AS usecases,
        COUNT(DISTINCT tcs.ts_id) AS scenarios,
        COUNT(DISTINCT tc.tc_id) AS testcases
      FROM testmodules tm
      LEFT JOIN testcasescenarios tcs 
        ON tm.module COLLATE utf8mb4_unicode_ci = tcs.module COLLATE utf8mb4_unicode_ci
      LEFT JOIN testcases tc 
        ON tcs.ts_id = tc.ts_id
      ${where}
      GROUP BY 
        tm.tm_id,
        tm.projectId,
        tm.module,
        tm.description,
        tm.testers,
        tm.developers,
        tm.status,
        tm.createdAt,
        tm.updatedAt,
        tm.deletedAt
      ORDER BY tm.createdAt DESC
      LIMIT 10000; -- guard to prevent excessive export
    `;

    const rows = await sequelize.query(sql, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    const items = Array.isArray(rows) ? rows : [];

    // ✅ Stream CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="modules_export_${Date.now()}.csv"`);

    // ✅ CSV header row (added counts)
    res.write('tm_id,projectId,module,description,testers,developers,status,createdAt,updatedAt,deletedAt,usecases,scenarios,testcases\n');

    for (const r of items) {
      const testers = r.testers ? JSON.stringify(r.testers).replace(/"/g, '""') : '';
      const developers = r.developers ? JSON.stringify(r.developers).replace(/"/g, '""') : '';
      const line = [
        r.tm_id,
        r.projectId,
        `"${String(r.module || '').replace(/"/g, '""')}"`,
        `"${String(r.description || '').replace(/"/g, '""')}"`,
        `"${testers}"`,
        `"${developers}"`,
        `"${String(r.status || '')}"`,
        r.createdAt ? `"${r.createdAt}"` : '',
        r.updatedAt ? `"${r.updatedAt}"` : '',
        r.deletedAt ? `"${r.deletedAt}"` : '',
        r.usecases || 0,
        r.scenarios || 0,
        r.testcases || 0
      ].join(',') + '\n';
      res.write(line);
    }

    res.end();

  } catch (err) {
    console.error('Error GET /api/testmodules/export/csv:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});


  
  // GET /api/testmodules
  // Filters: q, projectId, status, createdFrom, createdTo
  // Pagination: limit (default 25, max 1000), offset
  // Sorting: sortBy, sortDir
  router.get('/modules/list', async (req, res) => {
    try {

      const sql = `
        SELECT module
        FROM testmodules
      `;

      const rows = await sequelize.query(sql, {  type: sequelize.QueryTypes.SELECT });

      // parse JSON fields where present
      const items = (Array.isArray(rows) ? rows : []).map(r => {
        return r.module;
      });

      return res.json({
        items
      });
    } catch (err) {
      console.error('Error GET /api/testmodules:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });


  return router;
};
