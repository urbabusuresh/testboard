// components/ModuleDrawer.tsx
import React, { useState } from 'react';
import { ModuleItem } from '@/types/testmodule';
import ModuleForm from './ModuleForm';
import { updateModule } from './api';

type Props = {
  moduleItem?: ModuleItem | null;
  onClose: () => void;
  onUpdate?: () => void;
};

export default function ModuleDrawer({ moduleItem, onClose, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  
  if (!moduleItem) return null;
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
  };
  
  const handleSave = async (payload: Partial<ModuleItem>) => {
    try {
      await updateModule(moduleItem.tm_id, payload);
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      alert('Save failed: ' + (err?.message ?? String(err)));
    }
  };
  
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-96 bg-white shadow-xl p-4 overflow-auto">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{moduleItem.module}</h3>
            <div className="text-xs text-gray-500">Module Id: #{moduleItem.tm_id} [ Project Id: #{moduleItem.projectId}]</div>
          </div>
          <div className="flex gap-2">
            {!isEditing && <button onClick={handleEdit} className="text-blue-500 hover:text-blue-700">Edit</button>}
            <button onClick={onClose} className="text-gray-500">Close</button>
          </div>
        </div>

        {isEditing ? (
          <div className="mt-4">
            <ModuleForm 
              initial={moduleItem} 
              onCancel={handleCancel} 
              onSave={handleSave} 
              projectIdVal={moduleItem.projectId}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-600">Description</div>
              <div className="mt-1 text-gray-800 whitespace-pre-wrap">{moduleItem.description || '—'}</div>
            </div>

            <div>
              <div className="text-xs text-gray-600">Status</div>
              <div className="mt-1">
                {moduleItem.status !== undefined && moduleItem.status !== null ? 
                  ([1, '1', true].includes(moduleItem.status) ? 'ACTIVE' : 
                  String(moduleItem.status) === '0' ? 'INACTIVE' : '—') : '—'}    
                 
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-600">Testers</div>
              <div className="mt-1">{Array.isArray(moduleItem.testers) ? moduleItem.testers.join(', ') : moduleItem.testers || '—'}</div>
            </div>

            <div>
              <div className="text-xs text-gray-600">Developers</div>
              <div className="mt-1">{Array.isArray(moduleItem.developers) ? moduleItem.developers.join(', ') : moduleItem.developers || '—'}</div>
            </div>

            <div>
              <div className="text-xs text-gray-600">Created</div>
              <div className="mt-1 text-xs text-gray-500">{moduleItem.createdAt ? new Date(moduleItem.createdAt).toLocaleString() : '—'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
