// routes/project-configs.js
const express = require('express');
const path = require('path');
const { body, param, query, validationResult } = require('express-validator');

module.exports = function (sequelize) {
  const router = express.Router();

  const DEFAULT_TESTS_PATH = process.env.TESTS_PATH || '../PyTestOne/Tests';
  const BASE_TESTS_ROOT = process.env.BASE_TESTS_ROOT || null;

  /**
   * Helper: parse config_value safely (may be object or JSON string)
   */
  function safeParseConfigValue(v) {
    if (!v && v !== 0) return v;
    if (typeof v === 'object') return v;
    try { return JSON.parse(v); } catch (e) { return v; }
  }

  /**
   * Helper: resolve testpath from DB row + enforce BASE_TESTS_ROOT if set
   */
  function resolveTestPathFromRow(row, fallback = DEFAULT_TESTS_PATH) {
    try {
      if (!row) return path.resolve(fallback);
      const cfg = safeParseConfigValue(row.config_value || row.config_value);
      const candidate = (cfg && cfg.path) ? cfg.path : (row.value_text || fallback);
      const resolved = path.resolve(candidate);

      if (BASE_TESTS_ROOT) {
        const baseResolved = path.resolve(BASE_TESTS_ROOT);
        if (!(resolved === baseResolved || resolved.startsWith(baseResolved + path.sep))) {
          console.warn(`testpath ${resolved} is outside BASE_TESTS_ROOT, falling back`);
          return path.resolve(fallback);
        }
      }
      return resolved;
    } catch (err) {
      console.error('resolveTestPathFromRow error:', err);
      return path.resolve(fallback);
    }
  }

  /**
   * Middleware: common validation result handler
   */
  function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array().map(e => ({ param: e.param, msg: e.msg })) });
    }
    return next();
  }

  // -----------------------
  // List / search configs
  // GET /api/project-configs?projectId=&config_key=&env=&tenantId=&scope=&is_active=&limit=&offset=
  // -----------------------
  router.get('/',
    // optional query validators
    [
      query('projectId').optional().isInt({ min: 1 }).withMessage('projectId must be a positive integer'),
      query('tenantId').optional().isInt({ min: 1 }).withMessage('tenantId must be a positive integer'),
      query('env').optional().isString().isLength({ max: 32 }),
      query('config_key').optional().isString().isLength({ max: 128 }),
      query('is_active').optional().isIn(['0','1','true','false']).withMessage('is_active must be 0 or 1'),
      query('limit').optional().isInt({ min: 1, max: 5000 }),
      query('offset').optional().isInt({ min: 0 }),
      query('orderDir').optional().isIn(['ASC','DESC','asc','desc']),
      query('orderBy').optional().isString().isLength({ max: 64 })
    ],
    handleValidation,
    async (req, res) => {
      try {
        const {
          projectId,
          config_key,
          env,
          tenantId,
          scope,
          is_active,
          limit = 100,
          offset = 0,
          orderBy = 'projectid',
          orderDir = 'ASC'
        } = req.query;

        let where = 'WHERE 1=1';
        const replacements = [];

        if (projectId !== undefined && projectId !== '') {
          where += ' AND projectid = ?';
          replacements.push(Number(projectId));
        }
        if (config_key) {
          where += ' AND config_key = ?';
          replacements.push(config_key);
        }
        if (env) {
          where += ' AND env = ?';
          replacements.push(env);
        }
        if (tenantId !== undefined && tenantId !== '') {
          where += ' AND tenantid = ?';
          replacements.push(Number(tenantId));
        }
        if (scope) {
          where += ' AND scope = ?';
          replacements.push(scope);
        }
        if (typeof is_active !== 'undefined' && is_active !== '') {
          where += ' AND is_active = ?';
          replacements.push((is_active === '1' || is_active === 'true') ? 1 : 0);
        }

        const lim = Math.min(Number(limit) || 100, 5000);
        const off = Math.max(Number(offset) || 0, 0);
        const dir = String(orderDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const ob = String(orderBy).replace(/[^a-zA-Z0-9_]/g, '') || 'projectid';

        const sql = `
          SELECT *
          FROM projects_config
          ${where}
          ORDER BY ${ob} ${dir}
          LIMIT ? OFFSET ?;
        `;
        const finalReplacements = replacements.concat([lim, off]);

        const rows = await sequelize.query(sql, { replacements: finalReplacements, type: sequelize.QueryTypes.SELECT });
        const items = Array.isArray(rows) ? rows : [];

        // parse config_value
        const parsed = items.map(r => {
          try { r.config_value = safeParseConfigValue(r.config_value); } catch (e) {}
          return r;
        });

        // total count
        const countSql = `SELECT COUNT(*) AS total FROM projects_config ${where};`;
        const countRows = await sequelize.query(countSql, { replacements, type: sequelize.QueryTypes.SELECT });
        const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

        return res.json({ meta: { total, limit: lim, offset: off }, items: parsed });
      } catch (err) {
        console.error('Error GET /api/project-configs:', err);
        return res.status(500).json({ error: String(err.message || err) });
      }
    }
  );

  // -----------------------
  // Get single config by id
  // GET /api/project-configs/:id
  // -----------------------
  router.get('/:id',
    [ param('id').isInt({ min: 1 }).withMessage('id must be a positive integer') ],
    handleValidation,
    async (req, res) => {
      try {
        const { id } = req.params;
        const sql = `SELECT * FROM projects_config WHERE id = ? LIMIT 1;`;
        const rows = await sequelize.query(sql, { replacements: [Number(id)], type: sequelize.QueryTypes.SELECT });
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (!row) return res.status(404).json({ error: 'config not found' });
        row.config_value = safeParseConfigValue(row.config_value);
        return res.json({ config: row });
      } catch (err) {
        console.error('Error GET /api/project-configs/:id:', err);
        return res.status(500).json({ error: String(err.message || err) });
      }
    }
  );

  // -----------------------
  // Create config
  // POST /api/project-configs
  // Body: { projectid, tenantid?, env?, config_key, config_value, value_text?, scope?, is_active?, version?, effective_from?, effective_to?, created_by? }
  // -----------------------
  router.post('/',
    [
      body('projectid').exists().withMessage('projectid is required').bail().isInt({ min: 1 }).withMessage('projectid must be a positive integer'),
      body('config_key').exists().withMessage('config_key is required').bail().isString().isLength({ min: 1, max: 128 }),
      body('env').optional().isString().isLength({ max: 32 }),
      body('tenantid').optional({ nullable: true }).custom(val => val === null || Number.isInteger(Number(val))).withMessage('tenantid must be integer or null'),
      body('config_value').optional(),
      body('value_text').optional().isString(),
      body('scope').optional().isString(),
      body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
      body('version').optional().isInt({ min: 1 }).withMessage('version must be integer >=1'),
      body('effective_from').optional().isISO8601().withMessage('effective_from must be a valid datetime'),
      body('effective_to').optional().isISO8601().withMessage('effective_to must be a valid datetime'),
      body('created_by').optional().isInt({ min: 1 }).withMessage('created_by must be a positive integer')
    ],
    handleValidation,
    async (req, res) => {
      try {
        const {
          projectid, tenantid = null, env = 'all', config_key, config_value = {}, value_text = null,
          scope = null, is_active = 1, version = 1, effective_from = null, effective_to = null, created_by = null
        } = req.body;

        // ensure config_value is JSON-stringifiable (store as JSON in MySQL)
        const configValueToStore = (typeof config_value === 'string') ? (() => {
          try { return JSON.parse(config_value); } catch (e) { return { raw: config_value }; }
        })() : config_value;

        const sql = `
          INSERT INTO projects_config
            (projectid, tenantid, env, config_key, config_value, value_text, scope, is_active, version, effective_from, effective_to, created_by, updated_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());
        `;
        const replacements = [
          Number(projectid),
          tenantid === null ? null : Number(tenantid),
          env,
          config_key,
          JSON.stringify(configValueToStore),
          value_text,
          scope,
          is_active ? 1 : 0,
          Number(version),
          effective_from,
          effective_to,
          created_by,
          created_by
        ];

        const [insertRes] = await sequelize.query(sql, { replacements });
        const insertId = insertRes && insertRes.insertId ? insertRes.insertId : insertRes;

        const [rows] = await sequelize.query(`SELECT * FROM projects_config WHERE id = ? LIMIT 1;`, { replacements: [insertId], type: sequelize.QueryTypes.SELECT });
        const created = Array.isArray(rows) ? rows[0] : rows;
        if (created) created.config_value = safeParseConfigValue(created.config_value);

        return res.status(201).json({ config: created });
      } catch (err) {
        console.error('Error POST /api/project-configs:', err);
        return res.status(500).json({ error: String(err.message || err) });
      }
    }
  );

  // -----------------------
  // Patch config (partial update)
  // PATCH /api/project-configs/:id
  // -----------------------
  router.patch('/:id',
    [
      param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
      body().custom(body => {
        // require at least one updatable field
        const allowed = ['projectid','tenantid','env','config_key','config_value','value_text','scope','is_active','version','effective_from','effective_to','updated_by'];
        const has = Object.keys(body).some(k => allowed.includes(k));
        if (!has) throw new Error('no updatable fields provided');
        return true;
      }),
      body('projectid').optional().isInt({ min: 1 }).withMessage('projectid must be positive integer'),
      body('tenantid').optional({ nullable: true }).custom(val => val === null || Number.isInteger(Number(val))).withMessage('tenantid must be integer or null'),
      body('env').optional().isString().isLength({ max: 32 }),
      body('config_key').optional().isString().isLength({ min:1, max:128 }),
      body('config_value').optional(),
      body('value_text').optional().isString(),
      body('scope').optional().isString(),
      body('is_active').optional().isBoolean(),
      body('version').optional().isInt({ min: 1 }),
      body('effective_from').optional().isISO8601(),
      body('effective_to').optional().isISO8601(),
      body('updated_by').optional().isInt({ min: 1 })
    ],
    handleValidation,
    async (req, res) => {
      try {
        const { id } = req.params;
        const payload = req.body || {};
        const fields = [];
        const replacements = [];

        if (payload.projectid !== undefined) { fields.push('projectid = ?'); replacements.push(Number(payload.projectid)); }
        if (payload.tenantid !== undefined) { fields.push('tenantid = ?'); replacements.push(payload.tenantid === null ? null : Number(payload.tenantid)); }
        if (payload.env !== undefined) { fields.push('env = ?'); replacements.push(payload.env); }
        if (payload.config_key !== undefined) { fields.push('config_key = ?'); replacements.push(payload.config_key); }
        if (payload.config_value !== undefined) { fields.push('config_value = ?'); replacements.push(JSON.stringify(typeof payload.config_value === 'string' ? (() => { try { return JSON.parse(payload.config_value);} catch(e){ return { raw: payload.config_value }; } })() : payload.config_value)); }
        if (payload.value_text !== undefined) { fields.push('value_text = ?'); replacements.push(payload.value_text); }
        if (payload.scope !== undefined) { fields.push('scope = ?'); replacements.push(payload.scope); }
        if (payload.is_active !== undefined) { fields.push('is_active = ?'); replacements.push(payload.is_active ? 1 : 0); }
        if (payload.version !== undefined) { fields.push('version = ?'); replacements.push(Number(payload.version)); }
        if (payload.effective_from !== undefined) { fields.push('effective_from = ?'); replacements.push(payload.effective_from); }
        if (payload.effective_to !== undefined) { fields.push('effective_to = ?'); replacements.push(payload.effective_to); }
        if (payload.updated_by !== undefined) { fields.push('updated_by = ?'); replacements.push(payload.updated_by); }

        if (fields.length === 0) return res.status(400).json({ error: 'no updatable fields provided' });

        fields.push('updated_at = NOW()');

        const sql = `UPDATE projects_config SET ${fields.join(', ')} WHERE id = ?;`;
        replacements.push(Number(id));

        await sequelize.query(sql, { replacements });

        const [rows] = await sequelize.query(`SELECT * FROM projects_config WHERE id = ? LIMIT 1`, { replacements: [Number(id)], type: sequelize.QueryTypes.SELECT });
        const updated = Array.isArray(rows) ? rows[0] : rows;
        if (!updated) return res.status(404).json({ error: 'config not found' });
        updated.config_value = safeParseConfigValue(updated.config_value);

        return res.json({ config: updated });
      } catch (err) {
        console.error('Error PATCH /api/project-configs/:id:', err);
        return res.status(500).json({ error: String(err.message || err) });
      }
    }
  );

  // -----------------------
  // Soft delete config
  // DELETE /api/project-configs/:id  (sets is_active = 0)
  // -----------------------
  router.delete('/:id',
    [ param('id').isInt({ min: 1 }).withMessage('id must be a positive integer') ],
    handleValidation,
    async (req, res) => {
      try {
        const { id } = req.params;
        const sql = `UPDATE projects_config SET is_active = 0, updated_at = NOW() WHERE id = ?;`;
        await sequelize.query(sql, { replacements: [Number(id)] });
        return res.json({ success: true });
      } catch (err) {
        console.error('Error DELETE /api/project-configs/:id:', err);
        return res.status(500).json({ error: String(err.message || err) });
      }
    }
  );

  // -----------------------
  // Effective config lookup (prefer env then 'all')
  // GET /api/project-configs/effective?projectId=&config_key=&env=&tenantId=
  // -----------------------
  router.get('/effective',
    [
      query('projectId').exists().withMessage('projectId is required').bail().isInt({ min: 1 }),
      query('config_key').exists().withMessage('config_key is required').bail().isString().isLength({ min:1, max:128 }),
      query('env').optional().isString().isLength({ max: 32 }),
      query('tenantId').optional({ nullable: true }).custom(val => val === null || Number.isInteger(Number(val)))
    ],
    handleValidation,
    async (req, res) => {
      try {
        const { projectId, config_key, env = 'all', tenantId = null } = req.query;

        const sql = `
          SELECT *
          FROM projects_config pc
          WHERE pc.projectid = ?
            AND (pc.tenantid = ? OR pc.tenantid IS NULL)
            AND pc.config_key = ?
            AND pc.is_active = 1
            AND pc.env IN (?, 'all')
          ORDER BY (pc.env = ?) DESC, pc.version DESC, pc.effective_from DESC
          LIMIT 1;
        `;
        const replacements = [Number(projectId), tenantId === null ? null : Number(tenantId), config_key, env, env];
        const rows = await sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (!row) return res.status(404).json({ error: 'config not found' });
        row.config_value = safeParseConfigValue(row.config_value);
        return res.json({ config: row });
      } catch (err) {
        console.error('Error GET /api/project-configs/effective:', err);
        return res.status(500).json({ error: String(err.message || err) });
      }
    }
  );

  // -----------------------
  // Resolved testpath shortcut
  // GET /api/project-configs/resolved-testpath?projectId=&env=&tenantId=
  // -----------------------
  router.get('/resolved-testpath',
    [
      query('projectId').exists().withMessage('projectId is required').bail().isInt({ min: 1 }),
      query('env').optional().isString().isLength({ max: 32 }),
      query('tenantId').optional({ nullable: true }).custom(val => val === null || Number.isInteger(Number(val)))
    ],
    handleValidation,
    async (req, res) => {
      try {
        const { projectId, env = 'all', tenantId = null } = req.query;

        const sql = `
          SELECT *
          FROM projects_config pc
          WHERE pc.projectid = ?
            AND (pc.tenantid = ? OR pc.tenantid IS NULL)
            AND pc.config_key = 'testpath'
            AND pc.is_active = 1
            AND pc.env IN (?, 'all')
          ORDER BY (pc.env = ?) DESC, pc.version DESC, pc.effective_from DESC
          LIMIT 1;
        `;
        const replacements = [Number(projectId), tenantId === null ? null : Number(tenantId), env, env];
        const rows = await sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
        const row = Array.isArray(rows) ? rows[0] : rows;
        const resolved = resolveTestPathFromRow(row, DEFAULT_TESTS_PATH);
        return res.json({ testpath: resolved, usedConfig: row ? { ...row, config_value: safeParseConfigValue(row.config_value) } : null });
      } catch (err) {
        console.error('Error GET /api/project-configs/resolved-testpath:', err);
        return res.status(500).json({ error: String(err.message || err) });
      }
    }
  );

  return router;
};
