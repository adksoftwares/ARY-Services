import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function DataTable({
  columns = [], // [{ key, header, render: (row) => node }]
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found',
  className = ''
}) {
  return (
    <div className={`ds-table-wrapper ${className}`}>
      <table className="ds-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key || col.header} style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{emptyMessage}</span>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={row[keyField] ?? idx}>
                {columns.map((col) => (
                  <td key={col.key || col.header}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  className = ''
}) {
  const from = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={`ds-pagination ${className}`}>
      <div>
        {totalItems > 0 ? (
          <span>Showing <b>{from}</b> to <b>{to}</b> of <b>{totalItems}</b> entries</span>
        ) : (
          <span>Page {currentPage} of {totalPages}</span>
        )}
      </div>

      <div className="ds-pagination-controls">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
          icon={ChevronLeft}
          aria-label="Previous Page"
        >
          Previous
        </Button>

        <span style={{ padding: '0 var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
          {currentPage} / {totalPages || 1}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
          iconRight={ChevronRight}
          aria-label="Next Page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function Tooltip({ children, content, className = '' }) {
  return (
    <span className={`ds-tooltip-wrapper ${className}`} style={{ position: 'relative', display: 'inline-block' }}>
      {children}
    </span>
  );
}
