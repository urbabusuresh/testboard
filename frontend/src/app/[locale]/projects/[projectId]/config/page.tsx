import ProjectConfigsUI from "./ui";
export const dynamic = "force-dynamic";
import { getTranslations } from 'next-intl/server';
import { LocaleCodeType } from '@/types/locale';



export async function generateMetadata({ params: { locale } }: { params: { locale: LocaleCodeType} }) {
  
  const t = await getTranslations({ locale, namespace: 'Auth' });
  return {
    title: `${t('account')} | TestLab`,
    robots: { index: false, follow: false },
  };
}


type Props = { params: { locale: string; projectId: string; } };
export default function Page({ params }: Props) {
  const { projectId } = params;
  return <ProjectConfigsUI projectIdProp={projectId}/>;
 }