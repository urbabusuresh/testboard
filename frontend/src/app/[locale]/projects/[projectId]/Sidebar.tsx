'use client';

import React, { useEffect, useState } from 'react';
import { Button, Tooltip } from '@heroui/react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  FileText,
  Layers,
  ClipboardList,
  PlayCircle,
  Code,
  Users,
  BookOpen,
  Bug,
  Settings,
  Beaker,
  FileCode2,
  FileSpreadsheet,
  FileSearch,
  ChevronDown,
  ChevronRight,
  Upload,
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const ICON_STROKE = 1.5;
  const ICON_SIZE = 20;

  // restore open sections from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sidebar_open_sections');
      if (raw) setOpenSections(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  // persist open sections
  useEffect(() => {
    try {
      localStorage.setItem('sidebar_open_sections', JSON.stringify(openSections));
    } catch (e) {
      // ignore
    }
  }, [openSections]);

  // Menu config: mix of standalone items and expandable sections
  const menuConfig: Array<
    | { key: string; text: string; Icon: any; color: string }
    | { section: string; items: Array<{ key: string; text: string; Icon: any; color: string }> }
  > = [
    { key: 'home', text: messages.home, Icon: Home, color: '#7c3aed' },
    // { key: 'cases', text: messages.testCases, Icon: FileText, color: '#38bdf8' },
    
    {
      section: 'Testing',
      color: '#b48bfaff',
      items: [
        { key: 'testmodules', text: 'Test Modules', Icon: FileCode2, color: '#06b6d4' },
        { key: 'testusecases', text: 'Test UseCases', Icon: FileSpreadsheet, color: '#f59e0b' },
        { key: 'testscenarios', text: 'Test Scenarios', Icon: FileSearch, color: '#84cc16' },
        { key: 'testcases', text: 'Test Cases', Icon: ClipboardList, color: '#f43f5e' },
        { key: 'runs', text: messages.testRuns, Icon: Beaker, color: '#f97316' },
      ],
    },
    {
      section: 'Automation',
      color: '#88f3cfff',
      items: [
        { key: 'automation_cases', text: 'Automation Tests', Icon: Code, color: '#10b981' },
        { key: 'automation_groups', text: 'Automation Groups', Icon: Layers, color: '#ec4899' },
        { key: 'automation_runs', text: 'Automation Runs', Icon: PlayCircle, color: '#eab308' },
      ],
    },
    { key: 'members', text: messages.members, Icon: Users, color: '#6366f1' },
    { key: 'referencedocs', text: 'Reference Docs', Icon: BookOpen, color: '#3b82f6' },
    { key: 'bugs', text: 'BugZilla History', Icon: Bug, color: '#ef4444' },
    { key: 'upload_testdata', text: 'Upload TestData', Icon: Upload, color: '#e70791ff'},
    { key: 'settings', text: messages.settings, Icon: Settings, color: '#6b7280' },
  ];

  const handleClick = (key: string) => {
    const base = `/projects/${projectId}`;
    const routes: Record<string, string> = {
      home: `${base}/home`,
      cases: `${base}/folders`,
      runs: `${base}/runs`,
      members: `${base}/members`,
      settings: `${base}/settings`,
      automation_cases: `${base}/automation/cases`,
      automation_runs: `${base}/automation/runs`,
      automation_groups: `${base}/automation/groups`,
      testmodules: `${base}/testmodules`,
      testusecases: `${base}/testusecases`,
      testscenarios: `${base}/testscenarios`,
      testcases: `${base}/testcases`,
      bugs: `${base}/bugs`,
      upload_testdata: `${base}/uploadtestdata`,
      referencedocs: `${base}/referencedocs`,
    };

    const to = routes[key];
    if (to) router.push(to, { locale });
    setCurrentKey(key);
  };

  const toggleSection = (title: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      return next;
    });
  };

  return (
   <div className="relative  flex">
  <aside
    className="flex flex-col min-h-screen transition-all duration-200 ease-in-out  bg-gradient-to-br from-blue-50 via-green-50 to-pink-50 dark:bg-[#0b1221] px-1 py-3"
    style={{ width: isSideBarOpen ? 224 : 64 }}
  >
      {/* right divider */}
      <div className="absolute top-0 left-50  w-px h-screen bg-neutral-200 dark:bg-neutral-800" />
      <div className="absolute top-0  w-px h-screen bg-neutral-200 dark:bg-neutral-800" />
   
      {/* custom scrollbar styles */}
      <style>{`
        #sidebar-nav::-webkit-scrollbar { width: 10px; }
        #sidebar-nav::-webkit-scrollbar-track { background: transparent; }
        #sidebar-nav::-webkit-scrollbar-thumb { background-color: rgba(100,100,100,0.18); border-radius: 10px; }
        #sidebar-nav { scrollbar-width: thin; scrollbar-color: rgba(100,100,100,0.18) transparent; }
        .section-collapse { transition: max-height 220ms ease, opacity 180ms ease; overflow: hidden; }
      `}</style>

      {/* Toggle button */}
      <div className="flex items-center justify-end mb-3">
        <Tooltip content={messages.toggleSidebar} placement="right">
          <Button
            size="sm"
            isIconOnly
            variant="light"
            onPress={() => setIsSideBarOpen((s) => !s)}
            aria-label={isSideBarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
          >
            {isSideBarOpen ? (
              <PanelLeftClose strokeWidth={1.5} size={18} />
            ) : (
              <PanelLeftOpen strokeWidth={1.5} size={18} />
            )}
          </Button>
        </Tooltip>
      </div>

      {/* Scrollable menu */}
      <nav id="sidebar-nav" className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 72px)' }}>
        <ul className="space-y-1 px-1">
          {menuConfig.map((entry) => {
            if ('key' in entry) {
              const isActive = entry.key === currentKey;
              const Icon = entry.Icon;
              return (
                <li key={entry.key}>
                  <Tooltip hidden={isSideBarOpen} content={entry.text} placement="right">
                    <div
                      data-menu-item
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleClick(entry.key)}
                      onClick={() => handleClick(entry.key)}
                      className={`flex items-center cursor-pointer gap-2 px-2 py-1 rounded-md transition-all duration-150 text-left ${
                        isActive ? 'font-semibold' : 'text-neutral-700 dark:text-neutral-300'
                      } ${isActive ? '' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                      style={{ backgroundColor: isActive ? entry.color + '20' : 'transparent' }}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon strokeWidth={ICON_STROKE} size={ICON_SIZE} color={entry.color} className="shrink-0" />
                      {isSideBarOpen && (
                        <span className="text-sm truncate text-left" style={{ color: isActive ? entry.color : undefined }}>
                          {entry.text}
                        </span>
                      )}
                    </div>
                  </Tooltip>
                </li>
              );
            }

            // Section with expandable items
            return (
              <li key={entry.section}>
                <div
                  className={`flex items-center justify-between cursor-pointer px-2 py-1 text-xs font-semibold uppercase text-neutral-900 dark:text-neutral-600 tracking-wide rounded-md ${
                    openSections[entry.section] ? 'bg-neutral-100 dark:bg-neutral-500' : ''
                  }`}
                  onClick={() => toggleSection(entry.section)}
                >
                  {isSideBarOpen && <span>{entry.section}</span>}
                  {isSideBarOpen && (
                    openSections[entry.section] ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )
                  )}
                </div>

                {/* animated collapse container */}
                <div
                  className="section-collapse"
                  style={{
                    maxHeight: openSections[entry.section] ? `${(entry.items.length + 1) * 48}px` : '0px',
                    opacity: openSections[entry.section] ? 1 : 0,
                  }}
                >
                  <ul className="space-y-1">
                    {entry.items.map((item) => {
                      const isActive = item.key === currentKey;
                      const Icon = item.Icon;
                      return (
                        <li key={item.key}>
                          <Tooltip hidden={isSideBarOpen} content={item.text} placement="right">
                            <div
                              data-menu-item
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && handleClick(item.key)}
                              onClick={() => handleClick(item.key)}
                              className={`flex items-center cursor-pointer gap-1 pl-3 pr-2 py-1 rounded-md transition-all duration-150 text-left ${
                                isActive ? 'font-semibold' : 'text-neutral-700 dark:text-neutral-400'
                              } ${isActive ? '' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                              style={{ backgroundColor: isActive ? item.color + '20' : 'transparent' }}
                              aria-current={isActive ? 'page' : undefined}
                            >
                              <Icon strokeWidth={ICON_STROKE} size={ICON_SIZE} color={item.color} className="shrink-0" />
                              {isSideBarOpen && (
                                <span className="text-sm truncate text-left" style={{ color: isActive ? item.color : undefined }}>
                                  {item.text}
                                </span>
                              )}
                            </div>
                          </Tooltip>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
     <div className="absolute top-0 right-0 w-px h-full bg-neutral-200 dark:bg-neutral-800" />
</div>
  );
}