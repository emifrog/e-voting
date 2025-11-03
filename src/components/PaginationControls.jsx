import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Pagination Controls Component
 * Displays page navigation, page size selector, and info
 */
function PaginationControls({
  page,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  isLoading = false
}) {
  // Compute displayed count
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    onPageSizeChange(newSize);
  };

  const canGoFirst = page > 1;
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;
  const canGoLast = page < totalPages;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      background: '#f9fafb',
      borderRadius: '8px',
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      {/* Info section */}
      <div style={{ fontSize: '14px', color: '#6b7280', minWidth: '200px' }}>
        {total === 0 ? (
          <span>Aucun élément</span>
        ) : (
          <span>
            Affichage de <strong>{startIndex}</strong> à <strong>{endIndex}</strong> sur <strong>{total}</strong>
          </span>
        )}
      </div>

      {/* Page size selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label htmlFor="pageSize" style={{ fontSize: '14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
          Par page:
        </label>
        <select
          id="pageSize"
          value={pageSize}
          onChange={handlePageSizeChange}
          disabled={isLoading || total === 0}
          className="input"
          style={{
            width: '80px',
            padding: '8px',
            fontSize: '14px'
          }}
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={250}>250</option>
          <option value={500}>500</option>
        </select>
      </div>

      {/* Navigation buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {/* First page button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={!canGoFirst || isLoading}
          title="Première page"
          className="btn btn-sm btn-secondary"
          style={{
            padding: '8px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !canGoFirst ? 0.5 : 1,
            cursor: !canGoFirst ? 'not-allowed' : 'pointer'
          }}
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous page button */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrev || isLoading}
          title="Page précédente"
          className="btn btn-sm btn-secondary"
          style={{
            padding: '8px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !canGoPrev ? 0.5 : 1,
            cursor: !canGoPrev ? 'not-allowed' : 'pointer'
          }}
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page indicator */}
        <div style={{
          minWidth: '100px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '500',
          color: '#111827'
        }}>
          Page {totalPages === 0 ? 0 : page} / {totalPages}
        </div>

        {/* Next page button */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext || isLoading}
          title="Page suivante"
          className="btn btn-sm btn-secondary"
          style={{
            padding: '8px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !canGoNext ? 0.5 : 1,
            cursor: !canGoNext ? 'not-allowed' : 'pointer'
          }}
        >
          <ChevronRight size={16} />
        </button>

        {/* Last page button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoLast || isLoading}
          title="Dernière page"
          className="btn btn-sm btn-secondary"
          style={{
            padding: '8px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !canGoLast ? 0.5 : 1,
            cursor: !canGoLast ? 'not-allowed' : 'pointer'
          }}
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default PaginationControls;
