import React, { useState, useEffect, useRef } from "react";
import { getProjectMember } from "./membersControl";
import { Search, X, Loader2 } from "lucide-react";

export interface ProjectMember {
  userId: number;
  username: string;
  role: number;
}

interface MemberSelectorProps {
  projectId: number;
  roles?: number[] | string[] | any;
  onChange?: (selectedMembers: ProjectMember[]) => void;
  label?: string;
  allowMultiple?: boolean;
  selectedMembers?: ProjectMember[];
}

const MemberSelector: React.FC<MemberSelectorProps> = ({
  projectId,
  roles,
  onChange,
  label = "Select Members",
  allowMultiple = true,
  selectedMembers = [],
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [filtered, setFiltered] = useState<ProjectMember[]>([]);
  const [selected, setSelected] = useState<ProjectMember[]>(selectedMembers);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // simple deep compare
  const isEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

  // Load project members
  useEffect(() => {
    loadMembers();
  }, [projectId, roles]);

  // ✅ Prefill & sync selected members safely (no re-render loop)
  useEffect(() => {
    setSelected((prev) => {
      if (!isEqual(prev, selectedMembers || [])) {
        return selectedMembers || [];
      }
      return prev;
    });
  }, [selectedMembers]);

  // Close dropdown on click outside or ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowList(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && setShowList(false);

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const result = await getProjectMember(projectId, roles);
      setMembers(result);
      setFiltered(result);
    } catch (err) {
      console.error("Error loading members:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    const q = value.toLowerCase();
    setFiltered(
      members.filter(
        (m) => m.username.toLowerCase().includes(q) || String(m.userId).includes(q)
      )
    );
  };

  const handleSelect = (member: ProjectMember) => {
    setSelected((prev) => {
      let newList: ProjectMember[];

      if (allowMultiple) {
        const exists = prev.some((m) => m.userId === member.userId);
        newList = exists
          ? prev.filter((m) => m.userId !== member.userId)
          : [...prev, member];
      } else {
        newList = [member];
        setShowList(false);
      }

      // ✅ Deduplicate just in case
      newList = [...new Map(newList.map((m) => [m.userId, m])).values()];

      onChange?.(newList);
      return newList;
    });
  };

  const handleRemove = (memberId: number) => {
    setSelected((prev) => {
      const updated = prev.filter((m) => m.userId !== memberId);
      onChange?.(updated);
      return updated;
    });
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Selector Box */}
      <div
        className={`flex flex-wrap items-center gap-1 border rounded-lg px-2 py-2 bg-white cursor-text min-h-[42px] transition-all ${
          showList
            ? "ring-2 ring-blue-500 border-blue-400 shadow-sm"
            : "border-gray-300 hover:border-blue-300"
        }`}
        onClick={() => setShowList((prev) => !prev)}
      >
        {selected.length > 0 ? (
          // ✅ Deduplicate before rendering to prevent duplicate keys
          [...new Map(selected.map((m) => [m.userId, m])).values()].map((m) => (
            <span
              key={m.userId}
              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm"
            >
              {m.username}
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(m.userId);
                }}
              />
            </span>
          ))
        ) : (
          <span className="text-gray-400 text-sm">select members...</span>
        )}

        <div className="ml-auto">
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </div>

      {/* Dropdown List */}
      {showList && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Type to search..."
              className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
            />
          </div>

          <ul className="max-h-48 overflow-y-auto text-sm">
            {loading ? (
              <li className="p-3 text-gray-400 text-center">Loading...</li>
            ) : filtered.length > 0 ? (
              filtered.map((m) => (
                <li
                  key={m.userId}
                  onClick={() => handleSelect(m)}
                  className={`px-3 py-2 cursor-pointer flex justify-between items-center transition-colors ${
                    selected.some((s) => s.userId === m.userId)
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-blue-50"
                  }`}
                >
                  <span className="font-medium">{m.username}</span>
                  <span className="text-gray-400 text-xs">Role {m.role}</span>
                </li>
              ))
            ) : (
              <li className="p-3 text-gray-400 text-center">No members found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MemberSelector;
