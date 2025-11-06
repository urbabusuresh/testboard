export type PageType = {
  params: {
    locale: string;
  };
};

export type GlobalRoleType = {
  uid: 'administrator' | 'user';
};

export type MemberRoleType = {
  uid: 'manager' | 'lead' |'leadReviewer' | 'leadApprover'| 'developer' | 'reporter' | 'viewer'  | 'client';
};

export type AutomationStatusType = {
  uid: 'manual' | 'required' | 'automated' | 'obsolete';
};

export type TemplateType = {
  uid: 'text' | 'step';
};
