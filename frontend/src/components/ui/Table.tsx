
import React from 'react';

interface TableProps<T> {
  columns: { key: keyof T; header: string; render?: (item: T) => React.ReactNode }[];
  data: T[];
}

const Table = <T extends { id: string | number }>(
  { columns, data }: TableProps<T>
) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left text-gray-400">
        <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} scope="col" className="px-6 py-3">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
              {columns.map((col) => (
                <td key={String(col.key)} className="px-6 py-4">
                  {col.render ? col.render(item) : String(item[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
