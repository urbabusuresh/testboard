import { getTranslations } from 'next-intl/server';
import { LocaleCodeType } from '@/types/locale';
import { KanbanBoard } from './KanbanBoard';

export async function generateMetadata({ params: { locale } }: { params: { locale: LocaleCodeType } }) {
  const t = await getTranslations({ locale, namespace: 'Kanban' });
  return {
    title: `${t('kanban_board')} | TestLab`,
    robots: { index: false, follow: false },
  };
}

export default function Page({ params }: { params: { projectId: string } }) {
  return (
    <div className="container mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Kanban Board</h1>
        <p className="text-gray-600">Manage test cases with drag-and-drop workflow</p>
      </div>
      <KanbanBoard projectId={params.projectId} />
    </div>
  );
}
