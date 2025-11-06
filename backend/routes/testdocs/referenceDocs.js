// routes/referenceDocs.js
const express = require('express');

module.exports = function (sequelize) {
  const router = express.Router();

  const ALLOWED_SORT = new Set([
    'rd_id','projectId','tm_id','docsType','docName','version','status','createdAt','updatedAt','releaseDate'
  ]);
  function resolveSort(sortBy, sortDir) {
    if (!ALLOWED_SORT.has(sortBy)) sortBy = 'createdAt';
    sortDir = (sortDir && String(sortDir).toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    return { sortBy, sortDir };
  }

  /**
   * GET /api/referencedocs
   * Filters: q (docName/link/notes), projectId, tm_id, docsType, status, releaseFrom, releaseTo
   * Pagination: limit, offset
   * Sorting: sortBy, sortDir
   * includeDeleted=true to include soft-deleted rows
   */
  router.get('/', async (req, res) => {
    try {
      const {
        q,
        projectId,
        tm_id,
        docsType,
        status,
        releaseFrom,
        releaseTo,
        limit = 25,
        offset = 0,
        sortBy = 'createdAt',
        sortDir = 'DESC',
        includeDeleted = 'false'
      } = req.query;

      const { sortBy: col, sortDir: dir } = resolveSort(sortBy, sortDir);

      let where = 'WHERE 1=1';
      const replacements = [];

      if (includeDeleted !== 'true') where += ' AND deletedAt IS NULL';

      if (projectId !== undefined && projectId !== '') {
        where += ' AND projectId = ?';
        replacements.push(Number(projectId));
      }

      if (tm_id !== undefined && tm_id !== '') {
        where += ' AND tm_id = ?';
        replacements.push(Number(tm_id));
      }

      if (docsType) {
        where += ' AND docsType = ?';
        replacements.push(docsType);
      }

      if (status) {
        where += ' AND status = ?';
        replacements.push(status);
      }

      if (q) {
        const safeQ = String(q).replace(/[%_]/g, '\\$&');
        where += ' AND (docName LIKE ? OR link LIKE ? OR notes LIKE ?)';
        replacements.push(`%${safeQ}%`, `%${safeQ}%`, `%${safeQ}%`);
      }

      if (releaseFrom) {
        where += ' AND releaseDate >= ?';
        replacements.push(releaseFrom);
      }
      if (releaseTo) {
        where += ' AND releaseDate <= ?';
        replacements.push(releaseTo);
      }

      const lim = Math.min(Number(limit) || 25, 20000); // guard
      const off = Math.max(Number(offset) || 0, 0);

      const sql = `
        SELECT rd_id, projectId, tm_id, docsType, docName, version, link, status, releaseDate, notes, createdAt, updatedAt, deletedAt
        FROM ReferenceDocs
        ${where}
        ORDER BY ${col} ${dir}
        LIMIT ? OFFSET ?;
      `;
      const finalReplacements = replacements.concat([lim, off]);

      const rows = await sequelize.query(sql, { replacements: finalReplacements, type: sequelize.QueryTypes.SELECT });
      const items = Array.isArray(rows) ? rows : [];

      // total count for meta
      const countSql = `SELECT COUNT(*) AS total FROM ReferenceDocs ${where};`;
      const countReplacements = replacements.slice(0);
      const countRows = await sequelize.query(countSql, { replacements: countReplacements, type: sequelize.QueryTypes.SELECT });
      const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

      return res.json({
        meta: { total, limit: lim, offset: off },
        items
      });
    } catch (err) {
      console.error('Error GET /api/referencedocs:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // GET /api/referencedocs/counts -> KPI counts
  router.get('/counts', async (req, res) => {
    try {
      const sql = `
        SELECT
          (SELECT COUNT(*) FROM ReferenceDocs) AS total,
          (SELECT COUNT(*) FROM ReferenceDocs WHERE deletedAt IS NULL) AS active,
          (SELECT COUNT(*) FROM ReferenceDocs WHERE deletedAt IS NOT NULL) AS deleted
      ;`;
      const [rows] = await sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
      return res.json(rows[0] || { total: 0, active: 0, deleted: 0 });
    } catch (err) {
      console.error('Error GET /api/referencedocs/counts:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // GET /api/referencedocs/:id
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id required' });

      const sql = `
        SELECT rd_id, projectId, tm_id, docsType, docName, version, link, status, releaseDate, notes, createdAt, updatedAt, deletedAt
        FROM ReferenceDocs
        WHERE rd_id = ?
        LIMIT 1;
      `;
      const [rows] = await sequelize.query(sql, { replacements: [Number(id)], type: sequelize.QueryTypes.SELECT });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row) return res.status(404).json({ error: 'ReferenceDoc not found' });

      return res.json(row);
    } catch (err) {
      console.error('Error GET /api/referencedocs/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // POST /api/referencedocs
  router.post('/', async (req, res) => {
    try {
      const {
        projectId, tm_id, docsType, docName, version, link, status, releaseDate, notes
      } = req.body;

      if (!projectId) return res.status(400).json({ error: 'projectId is required' });
      if (tm_id === undefined || tm_id === null) return res.status(400).json({ error: 'tm_id is required' });
      if (!docName) return res.status(400).json({ error: 'docName is required' });

      const sql = `
        INSERT INTO ReferenceDocs
          (projectId, tm_id, docsType, docName, version, link, status, releaseDate, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());
      `;
      const replacements = [
        Number(projectId),
        Number(tm_id),
        docsType || null,
        docName,
        version || null,
        link || null,
        status || null,
        releaseDate || null,
        notes || null
      ];

      const [insertRes] = await sequelize.query(sql, { replacements });
      const insertId = insertRes && insertRes.insertId ? insertRes.insertId : insertRes;

      const [rows] = await sequelize.query(`SELECT * FROM ReferenceDocs WHERE rd_id = ? LIMIT 1`, { replacements: [insertId], type: sequelize.QueryTypes.SELECT });
      const created = Array.isArray(rows) ? rows[0] : rows;

      return res.status(201).json(created);
    } catch (err) {
      console.error('Error POST /api/referencedocs:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // PUT /api/referencedocs/:id
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });

      const fields = [];
      const replacements = [];

      if (payload.projectId !== undefined) { fields.push('projectId = ?'); replacements.push(Number(payload.projectId)); }
      if (payload.tm_id !== undefined) { fields.push('tm_id = ?'); replacements.push(payload.tm_id !== null ? Number(payload.tm_id) : null); }
      if (payload.docsType !== undefined) { fields.push('docsType = ?'); replacements.push(payload.docsType); }
      if (payload.docName !== undefined) { fields.push('docName = ?'); replacements.push(payload.docName); }
      if (payload.version !== undefined) { fields.push('version = ?'); replacements.push(payload.version); }
      if (payload.link !== undefined) { fields.push('link = ?'); replacements.push(payload.link); }
      if (payload.status !== undefined) { fields.push('status = ?'); replacements.push(payload.status); }
      if (payload.releaseDate !== undefined) { fields.push('releaseDate = ?'); replacements.push(payload.releaseDate); }
      if (payload.notes !== undefined) { fields.push('notes = ?'); replacements.push(payload.notes); }

      if (fields.length === 0) return res.status(400).json({ error: 'no updatable fields provided' });

      fields.push('updatedAt = NOW()');
      const sql = `UPDATE ReferenceDocs SET ${fields.join(', ')} WHERE rd_id = ? AND deletedAt IS NULL;`;
      replacements.push(Number(id));

      const [updateRes] = await sequelize.query(sql, { replacements });

      const [rows] = await sequelize.query(`SELECT * FROM ReferenceDocs WHERE rd_id = ? LIMIT 1`, { replacements: [Number(id)], type: sequelize.QueryTypes.SELECT });
      const updated = Array.isArray(rows) ? rows[0] : rows;
      if (!updated) return res.status(404).json({ error: 'ReferenceDoc not found or deleted' });

      return res.json(updated);
    } catch (err) {
      console.error('Error PUT /api/referencedocs/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // DELETE (soft) /api/referencedocs/:id
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id required' });

      const sql = `UPDATE ReferenceDocs SET deletedAt = NOW() WHERE rd_id = ? AND deletedAt IS NULL;`;
      const [result] = await sequelize.query(sql, { replacements: [Number(id)] });
      const affected = result && (result.affectedRows || result.affectedRows === 0 ? result.affectedRows : (result.affectedRows === undefined ? 1 : 0));
      if (!affected) return res.status(404).json({ error: 'ReferenceDoc not found or already deleted' });

      return res.json({ success: true });
    } catch (err) {
      console.error('Error DELETE /api/referencedocs/:id:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // DELETE hard /api/referencedocs/:id/hard
  router.delete('/:id/hard', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id required' });

      const sql = `DELETE FROM ReferenceDocs WHERE rd_id = ?;`;
      const [result] = await sequelize.query(sql, { replacements: [Number(id)] });
      const affected = result && (result.affectedRows || result.affectedRows === 0 ? result.affectedRows : (result.affectedRows === undefined ? 1 : 0));
      if (!affected) return res.status(404).json({ error: 'ReferenceDoc not found' });

      return res.json({ success: true });
    } catch (err) {
      console.error('Error DELETE HARD /api/referencedocs/:id/hard:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  // GET /api/referencedocs/export/csv
  router.get('/export/csv', async (req, res) => {
    try {
      const {
        q,
        projectId,
        tm_id,
        docsType,
        status,
        releaseFrom,
        releaseTo,
        includeDeleted = 'false'
      } = req.query;

      let where = 'WHERE 1=1';
      const replacements = [];
      if (includeDeleted !== 'true') where += ' AND deletedAt IS NULL';
      if (projectId) { where += ' AND projectId = ?'; replacements.push(Number(projectId)); }
      if (tm_id) { where += ' AND tm_id = ?'; replacements.push(Number(tm_id)); }
      if (docsType) { where += ' AND docsType = ?'; replacements.push(docsType); }
      if (status) { where += ' AND status = ?'; replacements.push(status); }
      if (q) {
        const safeQ = String(q).replace(/[%_]/g, '\\$&');
        where += ' AND (docName LIKE ? OR link LIKE ? OR notes LIKE ?)';
        replacements.push(`%${safeQ}%`, `%${safeQ}%`, `%${safeQ}%`);
      }
      if (releaseFrom) { where += ' AND releaseDate >= ?'; replacements.push(releaseFrom); }
      if (releaseTo) { where += ' AND releaseDate <= ?'; replacements.push(releaseTo); }

      const sql = `
        SELECT rd_id, projectId, tm_id, docsType, docName, version, link, status, releaseDate, notes, createdAt, updatedAt, deletedAt
        FROM ReferenceDocs
        ${where}
        ORDER BY createdAt DESC
        LIMIT 20000; -- guard
      `;
      const [rows] = await sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
      const items = Array.isArray(rows) ? rows : [];

      // stream CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="referencedocs_export_${Date.now()}.csv"`);

      res.write('rd_id,projectId,tm_id,docsType,docName,version,link,status,releaseDate,notes,createdAt,updatedAt,deletedAt\n');
      for (const r of items) {
        const line = [
          r.rd_id,
          r.projectId,
          r.tm_id,
          `"${String(r.docsType || '').replace(/"/g, '""')}"`,
          `"${String(r.docName || '').replace(/"/g, '""')}"`,
          `"${String(r.version || '').replace(/"/g, '""')}"`,
          `"${String(r.link || '').replace(/"/g, '""')}"`,
          `"${String(r.status || '').replace(/"/g, '""')}"`,
          r.releaseDate ? `"${r.releaseDate}"` : '',
          `"${String(r.notes || '').replace(/"/g, '""')}"`,
          r.createdAt ? `"${r.createdAt}"` : '',
          r.updatedAt ? `"${r.updatedAt}"` : '',
          r.deletedAt ? `"${r.deletedAt}"` : ''
        ].join(',') + '\n';
        res.write(line);
      }
      res.end();
    } catch (err) {
      console.error('Error GET /api/referencedocs/export/csv:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  return router;
};
