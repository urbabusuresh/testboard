'use client';
import { useEffect, useState, useContext, useMemo } from 'react';
import { Button, Chip, Input, Spinner } from '@heroui/react';
import { Plus, LayoutGrid, Rows } from 'lucide-react';
import ProjectsTable from './ProjectsTable';
import ProjectsCards from './ProjectsCards';
import { TokenContext } from '@/utils/TokenProvider';
import { ProjectDialogMessages, ProjectType, ProjectsMessages } from '@/types/project';
import ProjectDialog from '@/components/ProjectDialog';
import { fetchProjects, createProject } from '@/utils/projectsControl';
import { LocaleCodeType } from '@/types/locale';
import { logError } from '@/utils/errorHandler';

export type Props = {
  messages: ProjectsMessages;
  projectDialogMessages: ProjectDialogMessages;
  locale: LocaleCodeType;
};

export default function ProjectsPage({ messages, projectDialogMessages, locale }: Props) {
  const context = useContext(TokenContext);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    async function fetchDataEffect() {
      if (!context.isSignedIn()) {
        setLoading(false);
        return;
      }
      try {
        const data = await fetchProjects(context.token.access_token);
        if (active) setProjects(data);
      } catch (error: unknown) {
        logError('Error fetching data:', error);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchDataEffect();
    return () => {
      active = false;
    };
  }, [context]);

  // project dialog
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectType | null>(null);

  const openDialogForCreate = () => {
    setIsProjectDialogOpen(true);
    setEditingProject(null);
  };
  const closeDialog = () => {
    setIsProjectDialogOpen(false);
    setEditingProject(null);
  };

  const onSubmit = async (name: string, detail: string, isPublic: boolean) => {
    const newProject = await createProject(context.token.access_token, name, detail, isPublic);
    setProjects((prev) => [...prev, newProject]);
    context.refreshProjectRoles();
    closeDialog();
  };

  const filteredCount = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects.length;
    return projects.filter(
      (p) =>
        String(p.name ?? '').toLowerCase().includes(q) ||
        String(p.detail ?? '').toLowerCase().includes(q) ||
        String(p.id).includes(q)
    ).length;
  }, [projects, search]);

  return (
    <div className="container mx-auto max-w-6xl pt-12 px-6 flex-grow">
      {/* Toolbar */}
      <div className="w-full mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-xl">{messages.projectList}</h3>
          <Chip variant="flat" size="sm">
            {filteredCount}/{projects.length}
          </Chip>
        </div>

        <div className="flex items-center gap-2">
          <Input
            aria-label="Search projects"
            placeholder={messages.searchPlaceholder ?? 'Search projects...'}
            value={search}
            onValueChange={setSearch}
            size="sm"
            className="w-56"
          />
          <Button
            isIconOnly
            variant={view === 'cards' ? 'solid' : 'flat'}
            aria-label={messages.cardView ?? 'Card view'}
            onPress={() => setView('cards')}
          >
            <LayoutGrid size={16} />
          </Button>
          <Button
            isIconOnly
            variant={view === 'table' ? 'solid' : 'flat'}
            aria-label={messages.tableView ?? 'Table view'}
            onPress={() => setView('table')}
          >
            <Rows size={16} />
          </Button>
          <Button startContent={<Plus size={16} />} size="sm" color="primary" onPress={openDialogForCreate}>
            {messages.newProject}
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-default-200 p-5 animate-pulse">
              <div className="h-5 w-2/3 bg-default-200 rounded mb-3" />
              <div className="h-4 w-24 bg-default-200 rounded mb-4" />
              <div className="h-4 w-full bg-default-200 rounded mb-2" />
              <div className="h-4 w-5/6 bg-default-200 rounded mb-6" />
              <div className="flex justify-between">
                <div className="h-3 w-40 bg-default-200 rounded" />
                <div className="h-4 w-16 bg-default-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="w-full grid place-items-center py-16">
          <div className="text-center max-w-md">
            <h4 className="font-semibold mb-2">{messages.noProjectsFound}</h4>
            <p className="text-default-500 mb-4">
              {messages.noProjectsCtaText ?? 'Create your first project to get started.'}
            </p>
            <Button startContent={<Plus size={16} />} color="primary" onPress={openDialogForCreate}>
              {messages.newProject}
            </Button>
          </div>
        </div>
      ) : view === 'cards' ? (
        <ProjectsCards
          projects={projects}
          messages={messages}
          locale={locale}
          searchQuery={search}
          initialSort={{ column: 'updatedAt', direction: 'descending' }}
        />
      ) : (
        <div className="max-w-5xl">
          <ProjectsTable projects={projects} messages={messages} locale={locale} />
        </div>
      )}

      <ProjectDialog
        isOpen={isProjectDialogOpen}
        editingProject={editingProject}
        onCancel={closeDialog}
        onSubmit={onSubmit}
        projectDialogMessages={projectDialogMessages}
      />
    </div>
  );
}
