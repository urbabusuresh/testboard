'use client';
import { useMemo, useState, useCallback } from 'react';
import { Card, CardHeader, CardBody, CardFooter, Chip } from '@heroui/react';
import dayjs from 'dayjs';
import { Link, NextUiLinkClasses } from '@/src/i18n/routing';
import PublicityChip from '@/components/PublicityChip';
import { ProjectType, ProjectsMessages } from '@/types/project';
import { LocaleCodeType } from '@/types/locale';

type Props = {
  projects: ProjectType[];
  messages: ProjectsMessages;
  locale: LocaleCodeType;
  initialSort?: { column: 'id' | 'isPublic' | 'name' | 'updatedAt'; direction: 'ascending' | 'descending' };
  searchQuery?: string;
};

export default function ProjectsCards({
  projects,
  messages,
  locale,
  initialSort = { column: 'id', direction: 'ascending' },
  searchQuery = '',
}: Props) {
  const [sort] = useState(initialSort);

  const compare = useCallback(
    (a: ProjectType, b: ProjectType, key: keyof ProjectType) => {
      const va = a[key] as unknown;
      const vb = b[key] as unknown;

      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb, String(locale));
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      if (typeof va === 'boolean' && typeof vb === 'boolean') return va === vb ? 0 : va ? 1 : -1;

      return String(va).localeCompare(String(vb), String(locale));
    },
    [locale]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        String(p.name ?? '').toLowerCase().includes(q) ||
        String(p.detail ?? '').toLowerCase().includes(q) ||
        String(p.id).includes(q)
    );
  }, [projects, searchQuery]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    const cmp = (a: ProjectType, b: ProjectType) => {
      const res = compare(a, b, sort.column);
      return sort.direction === 'descending' ? -res : res;
    };
    items.sort(cmp);
    return items;
  }, [filtered, sort, compare]);

  const truncate = (text: string, n = 180) => (text && text.length > n ? `${text.slice(0, n)}…` : text ?? '');

  if (!sorted.length) {
    return (
      <div className="w-full grid place-items-center py-14">
        <Card className="max-w-lg w-full rounded-2xl shadow-md">
          <CardBody>
            <p className="text-center text-default-500">{messages.noProjectsFound}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {sorted.map((p) => {
        
       let updated: string;
       if (dayjs(p.updatedAt).isValid()) {
        updated = dayjs(p.updatedAt).format("YYYY/MM/DD HH:mm");
      }  else if (typeof p.updatedAt === "number" && dayjs(p.updatedAt * 1000).isValid()) {
          // Maybe it's in seconds, not ms
        updated = dayjs(p.updatedAt * 1000).format("YYYY/MM/DD HH:mm");
      } else {
           updated = "—"; // Fallback for invalid dates
      }

       
        // 🎨 Choose colors based on publicity
        const isPublic = Boolean(p.isPublic);
        const cardColor = isPublic ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200';
        const chipColor = isPublic ? 'success' : 'primary';

        return (
          <Card
            key={p.id}
            className={`rounded-2xl shadow-md border ${cardColor} hover:shadow-xl hover:scale-[1.02] transition-all h-full`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between w-full gap-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/projects/${p.id}/home`}
                    locale={locale}
                    className={`${NextUiLinkClasses} text-base font-semibold line-clamp-1`}
                  >
                    {p.name}
                  </Link>
                  <div className="mt-1">
                    <PublicityChip
                      isPublic={isPublic}
                      publicText={messages.public}
                      privateText={messages.private}
                    />
                  </div>
                </div>
                <Chip size="sm" color={chipColor} variant="flat">
                  {messages.id}: {p.id}
                </Chip>
              </div>
            </CardHeader>

            <CardBody className="pt-0">
              <p className="text-sm text-default-600 leading-6">{truncate(p.detail ?? '', 200)}</p>
            </CardBody>

            <CardFooter className="flex items-center justify-between pt-0">
              <span className="text-xs text-default-500">
                {messages.lastUpdate}: {updated}
              </span>
              <Link href={`/projects/${p.id}/home`} locale={locale} className={NextUiLinkClasses}>
                {messages.view ?? 'View'}
              </Link>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
