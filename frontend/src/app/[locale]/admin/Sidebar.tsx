'use client';
import { useState, useEffect } from 'react';
import { Button, Tooltip } from '@heroui/react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  FolderSyncIcon,
  UserCircle,
} from 'lucide-react';
import { usePathname, useRouter } from '@/src/i18n/routing';
import useGetCurrentIds from '@/utils/useGetCurrentIds';
import { ProjectMessages } from '@/types/project';

export type Props = {
  messages: ProjectMessages;
  locale: string;
};

export default function Sidebar({ messages, locale }: Props) {
  const { projectId } = useGetCurrentIds();
  const router = useRouter();
  const pathname = usePathname();

  const [currentKey, setCurrentKey] = useState('home');
  const [isSideBarOpen, setIsSideBarOpen] = useState(true);

  const TOGGLE_ICON_STROKE_WIDTH = 1;
  const TOGGLE_ICON_SIZE = 18;
  const ICON_STROKE_WIDTH = 1;
  const ICON_SIZE = 26;

  const handleClick = (key: string) => {
    if (key === 'admin') {
      router.push(`/admin`, { locale: locale });
    } else if (key === 'sync_module') {
      router.push(`/admin/modules`, { locale: locale });
    } 
  };

  useEffect(() => {
    const handleRouteChange = (currentPath: string) => {
      if (currentPath.includes('admin')) {
        setCurrentKey('admin');
      }  else if (currentPath.includes('modules')) {
        setCurrentKey('sync_module');
      } 
    };

    handleRouteChange(pathname);
  }, [pathname]);

  const tabItems = [
  {
    key: 'admin',
    text: messages.home,
    startContent: <UserCircle strokeWidth={ICON_STROKE_WIDTH} size={ICON_SIZE} color="#7c3aed" />, // purple
  },
  
  {
    key: 'sync_module',
    text: 'Sync Module',
    startContent: <FolderSyncIcon strokeWidth={ICON_STROKE_WIDTH} size={ICON_SIZE} color="#6366f1" />, // indigo
  },
  
];


  return (
    <div className="border-r-1 dark:border-neutral-700">
      <div className="w-full flex justify-end">
        <Tooltip content={messages.toggleSidebar} placement="right">
          <Button size="lg" isIconOnly variant="light" onPress={() => setIsSideBarOpen(!isSideBarOpen)}>
            {isSideBarOpen ? (
              <PanelLeftClose strokeWidth={TOGGLE_ICON_STROKE_WIDTH} size={TOGGLE_ICON_SIZE} />
            ) : (
              <PanelLeftOpen strokeWidth={TOGGLE_ICON_STROKE_WIDTH} size={TOGGLE_ICON_SIZE} />
            )}
          </Button>
        </Tooltip>
      </div>

      <div className="border-t-1 dark:border-neutral-700">
        {tabItems.map((itr) => (
          <div key={itr.key}>
            <Tooltip hidden={isSideBarOpen} content={itr.text} placement="right">
              <Button
                size="lg"
                isIconOnly={!isSideBarOpen}
                startContent={itr.startContent}
                isDisabled={itr.key === currentKey}
                variant="light"
                className={isSideBarOpen ? 'w-full justify-start' : ''}
                onPress={() => handleClick(itr.key)}
              >
                {isSideBarOpen ? itr.text : ''}
              </Button>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
}
