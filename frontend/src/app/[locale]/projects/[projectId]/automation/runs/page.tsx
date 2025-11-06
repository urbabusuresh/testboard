import UI from "./ui";
export const dynamic = "force-dynamic";
import { getTranslations } from 'next-intl/server';
import { LocaleCodeType } from '@/types/locale';

export async function generateMetadata({ params: { locale } }: { params: { locale: LocaleCodeType } }) {
  const t = await getTranslations({ locale, namespace: 'Auth' });
  return {
    title: `${t('account')} | TestLab`,
    robots: { index: false, follow: false },
  };
}
export default function Page({ params: { projectId } }: { params: { projectId: string } }) 
{ return <UI projectIdProp={projectId} runId='null'/>; }
