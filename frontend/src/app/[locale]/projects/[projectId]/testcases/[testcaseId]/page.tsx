import { useTranslations } from 'next-intl';
import CaseEditor from './CaseEditor';
import { PriorityMessages } from '@/types/priority';
import { TestTypeMessages ,TestCaseIntent} from '@/types/testType';


type Props = { params: {
    projectId: string;
    testcaseId: string;
    locale: string;
  } ;
searchParams: { ts?: string | any,buildId: string; };

};
export default function Page({ params ,searchParams }: Props){
   
  const t = useTranslations('Case');
  const messages = {
    backToCases: t('back_to_cases'),
    updating: t('updating'),
    update: t('update'),
    updatedTestCase: t('updated_test_case'),
    basic: t('basic'),
    title: t('title'),
    pleaseEnterTitle: t('please_enter_title'),
    description: t('description'),
    testCaseDescription: t('test_case_description'),
    priority: t('priority'),
    type: t('type'),
    template: t('template'),
    testDetail: t('test_detail'),
    preconditions: t('preconditions'),
    expectedResult: t('expected_result'),
    testcaseResultType: t('testcase_result_type'),
    automationStatus:t('automation_status'),
    step: t('step'),
    text: t('text'),
    steps: t('steps'),
    newStep: t('new_step'),
    detailsOfTheStep: t('details_of_the_step'),
    deleteThisStep: t('delete_this_step'),
    insertStep: t('insert_step'),
    attachments: t('attachments'),
    delete: t('delete'),
    download: t('download'),
    deleteFile: t('delete_file'),
    clickToUpload: t('click_to_upload'),
    orDragAndDrop: t('or_drag_and_drop'),
    maxFileSize: t('max_file_size'),
    areYouSureLeave: t('are_you_sure_leave'),
  };

  const tt = useTranslations('Type');
  const testTypeMessages: TestTypeMessages = {
    other: tt('other'),
    security: tt('security'),
    performance: tt('performance'),
    accessibility: tt('accessibility'),
    functional: tt('functional'),
    acceptance: tt('acceptance'),
    usability: tt('usability'),
    smokeSanity: tt('smoke_sanity'),
    compatibility: tt('compatibility'),
    destructive: tt('destructive'),
    regression: tt('regression'),
    automated: tt('automated'),
    manual: tt('manual'),
  };

  const priorityTranslation = useTranslations('Priority');
  const priorityMessages: PriorityMessages = {
    critical: priorityTranslation('critical'),
    high: priorityTranslation('high'),
    medium: priorityTranslation('medium'),
    low: priorityTranslation('low'),
  };


  return (
    <CaseEditor
      projectId={params.projectId}
      caseId={params.testcaseId}
      testScenarioId={searchParams.ts}
      messages={messages}
      buildId={searchParams.buildId}
      locale={params.locale}
    />
  );
}
