// backend/lib/automation/scheduler.js  (PURE CommonJS)

const schedule = require("node-schedule");
const { startRun } = require("./runner");

// routes/automation/service/scheduler.js

const { sequelize } = require("../../../models");
const { AutoTestRun } = sequelize.models;

class Scheduler {
  constructor() { this.jobs = new Map(); }

  async scheduleFromDB() {
    const rows = await AutoTestRun.findAll({
      where: { ts_type: "scheduled", status: "queued" },
      order: [["created_at","DESC"]],
    });
    for (const r of rows) this.add(r);
  }

  add(runRow) {
    const get = (k) => (typeof runRow.get === "function" ? runRow.get(k) : runRow[k]);
    const id = get("testrunid");
    const repeated = get("ts_repeated") === "Y";
    const when = get("ts_schedule_time");
    if (!when) return;

    const whenDate = when instanceof Date ? when : new Date(when);
    if (repeated) {
      const hh = whenDate.getHours(), mm = whenDate.getMinutes(), ss = whenDate.getSeconds();
      const scheduleNext = () => {
        const now = new Date();
        const next = new Date(now);
        next.setHours(hh, mm, ss, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        const ms = next - now;
        const timer = setTimeout(async () => {
          try { await startRun(this._payloadFromRow(runRow)); }
          catch (e) { console.error("[scheduler]", e); }
          finally { scheduleNext(); }
        }, ms);
        this.jobs.set(id, { timer, repeated: true, hh, mm, ss });
      };
      scheduleNext();
    } else {
      const delay = Math.max(0, whenDate - Date.now());
      const timer = setTimeout(async () => {
        try { await startRun(this._payloadFromRow(runRow)); }
        catch (e) { console.error("[scheduler]", e); }
        finally { this.remove(id); }
      }, delay);
      this.jobs.set(id, { timer, repeated: false });
    }
    return id;
  }

  remove(id) {
    const job = this.jobs.get(id);
    if (job?.timer) clearTimeout(job.timer);
    this.jobs.delete(id);
  }

  _payloadFromRow(r) {
    const get = (k) => (typeof r.get === "function" ? r.get(k) : r[k]);
    return {
      ts_type: "immediate",
      ts_repeated: "N",
      ts_buildname: get("ts_buildname"),
      ts_description: get("ts_description"),
      ts_env: get("ts_env"),
      ts_browser: get("ts_browser"),
      testdataPath: get("testdataPath"),
      ts_case_id: get("ts_case_id"),
      test_group_id: get("test_group_id"),
      scenario: "scheduled",
    };
  }
}

module.exports = { Scheduler };
