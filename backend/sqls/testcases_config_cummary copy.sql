USE rapr_test_automation;

SELECT
  (SELECT COUNT(*) FROM TestUseCases) AS total_usecases,
  (SELECT COUNT(*) FROM TestCaseScenarios) AS total_scenarios,
  (SELECT COUNT(*) FROM TestCases) AS total_testcases,
  (SELECT COUNT(*) 
     FROM TestUseCases uc
     WHERE NOT EXISTS (
       SELECT 1 FROM TestCaseScenarios ts 
       WHERE ts.uc_sid = uc.uc_sid
     )
  ) AS usecases_without_scenarios,
  (SELECT COUNT(*) 
     FROM TestCaseScenarios ts
     WHERE NOT EXISTS (
       SELECT 1 FROM TestCases tc 
       WHERE tc.ts_id = ts.ts_id
     )
  ) AS scenarios_without_testcases,
  (SELECT COUNT(*) 
     FROM TestCases tc
     WHERE NOT EXISTS (
       SELECT 1 FROM TestCaseScenarios ts 
       WHERE ts.ts_id = tc.ts_id
     )
  ) AS testcases_without_scenarios,
  (SELECT COUNT(*) 
     FROM TestUseCases uc
     WHERE  EXISTS (
       SELECT 1 FROM TestCaseScenarios ts 
       WHERE ts.uc_sid = uc.uc_sid
     )
  ) AS usecases_with_scenarios,
  (SELECT COUNT(*) 
     FROM TestCaseScenarios ts
     WHERE  EXISTS (
       SELECT 1 FROM TestCases tc 
       WHERE tc.ts_id = ts.ts_id
     )
  ) AS scenarios_with_testcases,
  (SELECT COUNT(*) 
     FROM TestCases tc
     WHERE  EXISTS (
       SELECT 1 FROM TestCaseScenarios ts 
       WHERE ts.ts_id = tc.ts_id
     )
  ) AS testcases_with_scenarios;
