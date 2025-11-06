USE rapr_test_automation;
DELIMITER $$

CREATE PROCEDURE GetProjectTestStats(IN p_projectId INT)
BEGIN
    SELECT
      (SELECT COUNT(*) FROM TestUseCases uc WHERE uc.projectId = p_projectId) AS total_usecases,
      (SELECT COUNT(*) FROM TestCaseScenarios ts WHERE ts.projectId = p_projectId) AS total_scenarios,
      (SELECT COUNT(*) FROM TestCases tc WHERE tc.projectId = p_projectId) AS total_testcases,

      (SELECT COUNT(*) 
         FROM TestUseCases uc
         WHERE uc.projectId = p_projectId
           AND NOT EXISTS (
             SELECT 1 FROM TestCaseScenarios ts 
             WHERE ts.uc_sid = uc.uc_sid
               AND ts.projectId = p_projectId
           )
      ) AS usecases_without_scenarios,

      (SELECT COUNT(*) 
         FROM TestCaseScenarios ts
         WHERE ts.projectId = p_projectId
           AND NOT EXISTS (
             SELECT 1 FROM TestCases tc 
             WHERE tc.ts_id = ts.ts_id
               AND tc.projectId = p_projectId
           )
      ) AS scenarios_without_testcases,

      (SELECT COUNT(*) 
         FROM TestCases tc
         WHERE tc.projectId = p_projectId
           AND NOT EXISTS (
             SELECT 1 FROM TestCaseScenarios ts 
             WHERE ts.ts_id = tc.ts_id
               AND ts.projectId = p_projectId
           )
      ) AS testcases_without_scenarios,

      (SELECT COUNT(*) 
         FROM TestUseCases uc
         WHERE uc.projectId = p_projectId
           AND EXISTS (
             SELECT 1 FROM TestCaseScenarios ts 
             WHERE ts.uc_sid = uc.uc_sid
               AND ts.projectId = p_projectId
           )
      ) AS usecases_with_scenarios,

      (SELECT COUNT(*) 
         FROM TestCaseScenarios ts
         WHERE ts.projectId = p_projectId
           AND EXISTS (
             SELECT 1 FROM TestCases tc 
             WHERE tc.ts_id = ts.ts_id
               AND tc.projectId = p_projectId
           )
      ) AS scenarios_with_testcases,

      (SELECT COUNT(*) 
         FROM TestCases tc
         WHERE tc.projectId = p_projectId
           AND EXISTS (
             SELECT 1 FROM TestCaseScenarios ts 
             WHERE ts.ts_id = tc.ts_id
               AND ts.projectId = p_projectId
           )
      ) AS testcases_with_scenarios;
END$$

DELIMITER ;
