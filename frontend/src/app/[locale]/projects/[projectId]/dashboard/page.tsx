import { getTranslations } from 'next-intl/server';
import { LocaleCodeType } from '@/types/locale';
import { EnhancedDashboard } from './EnhancedDashboard';

export async function generateMetadata({ params: { locale } }: { params: { locale: LocaleCodeType } }) {
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  return {
    title: `${t('dashboard')} | TestLab`,
    robots: { index: false, follow: false },
  };
}

export default function Page({ params }: { params: { projectId: string } }) {
  return (
    <div className="container mx-auto">
      <div className="mb-4 p-6">
        <h1 className="text-3xl font-bold">Project Dashboard</h1>
        <p className="text-gray-600">Comprehensive project metrics and insights</p>
      </div>
      <EnhancedDashboard projectId={params.projectId} />
    </div>
  );
}
