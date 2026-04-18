import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { MoreVertical } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AdminActionMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface AdminActionMenuProps {
  items: AdminActionMenuItem[];
  className?: string;
}

export function AdminActionMenu({ items, className }: AdminActionMenuProps) {
  return (
    <Menu as="div" className={cn('relative inline-block text-left', className)}>
      <Menu.Button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
        <MoreVertical className="h-4 w-4" />
      </Menu.Button>
      <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
        <Menu.Items className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {items.map((item, i) => (
              <Menu.Item key={i}>
                {({ active }) => (
                  <button
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={cn(
                      'flex w-full items-center gap-2 px-4 py-2 text-sm',
                      item.variant === 'danger' ? 'text-red-700' : 'text-gray-700',
                      active ? 'bg-gray-100' : '',
                      item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
