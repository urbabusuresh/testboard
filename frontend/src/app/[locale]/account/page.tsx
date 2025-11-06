import { useTranslations } from 'next-intl';
import AccountPage from './AccountPage';
import { PageType } from '@/types/base';
import { LocaleCodeType } from '@/types/locale';
import { redirect } from 'next/navigation';

export default function Page({ params }: PageType) {
  const t = useTranslations('Auth');
  const messages = {
    yourProjects: t('your_projects'),
    public: t('public'),
    private: t('private'),
    notOwnAnyProjects: t('not_own_any_projects'),
    findProjects: t('find_projects'),
  };
 
  return redirect(`/${params.locale}/projects`)
  
  // <AccountPage messages={messages} locale={params.locale as LocaleCodeType} />;
}
