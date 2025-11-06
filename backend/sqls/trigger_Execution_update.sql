DELIMITER $$

CREATE TRIGGER trg_sync_testcase_executions_update
AFTER UPDATE ON rapr_test_automation.runs
FOR EACH ROW
BEGIN
  -- Only run if tc_id changed
  IF (NEW.tc_id <> OLD.tc_id) THEN

    -- ✅ Insert newly added testcases
    INSERT INTO rapr_test_automation.testcase_executions (
      execution_id,
      projectId,
      run_id,
      testcase_id,
      cycle_number,
      status,
      execution_state,
      include_in_run,
      created_at
    )
    WITH RECURSIVE split_tc_ids AS (
      SELECT 
        TRIM(SUBSTRING_INDEX(NEW.tc_id, ',', 1)) COLLATE utf8mb4_unicode_ci AS tc_code,
        TRIM(SUBSTRING(NEW.tc_id, LENGTH(SUBSTRING_INDEX(NEW.tc_id, ',', 1)) + 2)) COLLATE utf8mb4_unicode_ci AS remaining
      UNION ALL
      SELECT 
        TRIM(SUBSTRING_INDEX(remaining, ',', 1)) COLLATE utf8mb4_unicode_ci AS tc_code,
        TRIM(SUBSTRING(remaining, LENGTH(SUBSTRING_INDEX(remaining, ',', 1)) + 2)) COLLATE utf8mb4_unicode_ci
      FROM split_tc_ids
      WHERE remaining <> ''
    )
    SELECT
      CAST(UNIX_TIMESTAMP(NOW(3)) * 1000 + t.tc_sid AS UNSIGNED) AS execution_id,
      NEW.projectId,
      NEW.id AS run_id,
      t.tc_sid AS testcase_id,
      1 AS cycle_number,
      'Untested' AS status,
      0 AS execution_state,
      1 AS include_in_run,
      NOW() AS created_at
    FROM split_tc_ids s
    JOIN rapr_test_automation.testcases t 
      ON t.tc_id COLLATE utf8mb4_unicode_ci = s.tc_code COLLATE utf8mb4_unicode_ci
      AND t.projectId = NEW.projectId
    WHERE NOT EXISTS (
      SELECT 1 
      FROM rapr_test_automation.testcase_executions te
      WHERE te.projectId = NEW.projectId
        AND te.run_id = NEW.id
        AND te.testcase_id = t.tc_sid
    );

    -- ❌ Delete testcases removed from run
    DELETE te 
    FROM rapr_test_automation.testcase_executions te
    WHERE te.projectId = NEW.projectId
      AND te.run_id = NEW.id
      AND te.testcase_id NOT IN (
        SELECT t.tc_sid
        FROM rapr_test_automation.testcases t
        JOIN (
          WITH RECURSIVE split_tc_ids AS (
            SELECT 
              TRIM(SUBSTRING_INDEX(NEW.tc_id, ',', 1)) COLLATE utf8mb4_unicode_ci AS tc_code,
              TRIM(SUBSTRING(NEW.tc_id, LENGTH(SUBSTRING_INDEX(NEW.tc_id, ',', 1)) + 2)) COLLATE utf8mb4_unicode_ci AS remaining
            UNION ALL
            SELECT 
              TRIM(SUBSTRING_INDEX(remaining, ',', 1)) COLLATE utf8mb4_unicode_ci AS tc_code,
              TRIM(SUBSTRING(remaining, LENGTH(SUBSTRING_INDEX(remaining, ',', 1)) + 2)) COLLATE utf8mb4_unicode_ci
            FROM split_tc_ids
            WHERE remaining <> ''
          )
          SELECT tc_code FROM split_tc_ids
        ) AS split 
          ON split.tc_code COLLATE utf8mb4_unicode_ci = t.tc_id COLLATE utf8mb4_unicode_ci
        WHERE t.projectId = NEW.projectId
      );
  END IF;
END$$

DELIMITER ;
