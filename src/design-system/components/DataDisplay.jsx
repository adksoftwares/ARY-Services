import React, { useId } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found',
  ariaLabel = 'Data table',
  caption,
  className = ''
}) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className={`ds-table-wrapper ${className}`} role="region" aria-label={ariaLabel} tabIndex={0}>
      <table className="ds-table">
        {caption && <caption className="ds-table-caption">{caption}</caption>}
        <thead>
          <tr>
            {safeColumns.map((column) => (
              <th key={column.key || column.header} scope="col" style={{ width: column.width }}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeData.length === 0 ? (
            <tr>
              <td colSpan={Math.max(safeColumns.length, 1)} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <span role="status" style={{ color: 'var(--text-muted)' }}>{emptyMessage}</span>
              </td>
            </tr>
          ) : (
            safeData.map((row, index) => (
              <tr key={row?.[keyField] ?? index}>
                {safeColumns.map((column) => (
                  <td key={column.key || column.header}>
                    {column.render ? column.render(row) : row?.[column.key]}
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
  const pageCount = Math.max(1, Number.isFinite(Number(totalPages)) ? Math.floor(Number(totalPages)) : 1);
  const page = Math.min(pageCount, Math.max(1, Number.isFinite(Number(currentPage)) ? Math.floor(Number(currentPage)) : 1));
  const size = Math.max(1, Number.isFinite(Number(pageSize)) ? Math.floor(Number(pageSize)) : 10);
  const count = Math.max(0, Number.isFinite(Number(totalItems)) ? Math.floor(Number(totalItems)) : 0);
  const from = count > 0 ? Math.min((page - 1) * size + 1, count) : 0;
  const to = Math.min(page * size, count);

  return (
    <nav className={`ds-pagination ${className}`} aria-label="Pagination">
      <div aria-live="polite" aria-atomic="true">
        {count > 0 ? (
          <span>Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> entries</span>
        ) : (
          <span>Page {page} of {pageCount}</span>
        )}
      </div>
      <div className="ds-pagination-controls">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
          icon={ChevronLeft}
          aria-label="Previous Page"
        >
          Previous
        </Button>
        <span aria-current="page" style={{ padding: '0 var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
          {page} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange?.(page + 1)}
          iconRight={ChevronRight}
          aria-label="Next Page"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

export function Tooltip({ children, content, className = '' }) {
  const tooltipId = useId();
  const child = React.isValidElement(children) && children.type !== React.Fragment
    ? React.cloneElement(children, {
        'aria-describedby': [children.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')
      })
    : children;

  return (
    <span className={`ds-tooltip-wrapper ${className}`} aria-describedby={tooltipId}>
      {child}
      <span id={tooltipId} className="ds-tooltip-content" role="tooltip">
        {content}
      </span>
    </span>
  );
}
