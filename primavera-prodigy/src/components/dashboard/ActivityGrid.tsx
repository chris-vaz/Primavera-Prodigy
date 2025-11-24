import React, { useMemo, memo } from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable
} from '@tanstack/react-table';
import { useFilteredActivities } from '../../hooks/useFilteredActivities';
import type { P6Activity } from '../../lib/xer-parser/types';

const columnHelper = createColumnHelper<P6Activity>();

// Memoized table row component for performance
const TableRow = memo(({ row, columns }: { row: any; columns: any }) => (
    <tr>
        {row.getVisibleCells().map((cell: any) => (
            <td 
                key={cell.id}
                style={{ width: cell.column.getSize() }}
            >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
        ))}
    </tr>
));

TableRow.displayName = 'TableRow';

// Define table columns
const columns = [
    columnHelper.accessor('task_code', {
        header: () => 'Activity ID',
        cell: info => (
            <span className="activity-id">
                {info.getValue()}
            </span>
        ),
        size: 120,
    }),
    columnHelper.accessor('task_name', {
        header: () => 'Activity Name',
        cell: info => (
            <span className="activity-name" title={info.getValue()}>
                {info.getValue()}
            </span>
        ),
        size: 350,
    }),
    columnHelper.accessor('early_start_date', {
        header: () => 'Start Date',
        cell: info => {
            const date = info.getValue().split(' ')[0];
            return (
                <span className="activity-date">
                    {date}
                </span>
            );
        },
        size: 120,
    }),
    columnHelper.accessor('early_end_date', {
        header: () => 'End Date',
        cell: info => {
            const date = info.getValue().split(' ')[0];
            return (
                <span className="activity-date">
                    {date}
                </span>
            );
        },
        size: 120,
    }),
    columnHelper.accessor('total_float', {
        header: () => 'Float',
        cell: info => {
            const float = info.getValue();
            const isCritical = float <= 0;
            return (
                <span className={`float-badge ${isCritical ? 'critical' : 'normal'}`}>
                    {float} days
                </span>
            );
        },
        size: 100,
    }),
];

const ActivityGrid: React.FC = () => {
    const data = useFilteredActivities();

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    // Memoize rows to prevent unnecessary re-renders
    const rows = useMemo(() => table.getRowModel().rows, [table]);

    if (data.length === 0) {
        return (
            <div className="activity-grid-container">
                <div className="activity-grid-wrapper">
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="empty-title">No activities found</p>
                        <p className="empty-description">Try selecting a different WBS node</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="activity-grid-container">
            <div className="activity-grid-wrapper">
                <div className="activity-table-scroll">
                    <table className="activity-table">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th
                                            key={header.id}
                                            colSpan={header.colSpan}
                                            style={{ width: header.getSize() }}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <TableRow key={row.id} row={row} columns={columns} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ActivityGrid;