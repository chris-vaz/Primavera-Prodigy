import type { P6Project, XERTable } from './types';

export class XERParser {
    private rawContent: string;

    constructor(content: string) {
        this.rawContent = content;
    }

    // 1. Generic Parser: Turns XER string into Array of Tables
    private parseRawTables(): XERTable[] {
        const lines = this.rawContent.split(/\r?\n/);
        const tables: XERTable[] = [];

        let currentTable: XERTable | null = null;

        for (const line of lines) {
            const parts = line.split('\t');
            const recordType = parts[0]; // %T, %F, or %R

            if (recordType === '%T') {
                // New Table Definition
                currentTable = { name: parts[1], columns: [], rows: [] };
                tables.push(currentTable);
            } else if (recordType === '%F' && currentTable) {
                // Field Names (Columns)
                // parts[0] is %F, so we slice from 1
                currentTable.columns = parts.slice(1);
            } else if (recordType === '%R' && currentTable) {
                // Row Data
                const rowData: Record<string, string> = {};
                const values = parts.slice(1);

                currentTable.columns.forEach((col, index) => {
                    rowData[col] = values[index] || '';
                });
                currentTable.rows.push(rowData);
            }
        }
        return tables;
    }

    // 2. Mapper: Converts Raw Tables into our Clean Schema
    public parse(): P6Project {
        const tables = this.parseRawTables();

        // Helper to find a specific table
        const findTable = (name: string) => tables.find(t => t.name === name);

        const projectTable = findTable('PROJECT');
        const taskTable = findTable('TASK');
        const wbsTable = findTable('PROJWBS');
        const relationTable = findTable('TASKPRED');

        if (!projectTable) throw new Error("Invalid XER: No PROJECT table found");

        // Map the data (Simplified for brevity - in real app we map fields strictly)
        const projectRow = projectTable.rows[0];

        return {
            meta: { exportDate: new Date(), user: 'User' }, // Placeholder for Header parsing
            project: {
                id: projectRow['proj_id'],
                shortName: projectRow['proj_short_name'],
                name: projectRow['project_name']
            },
            // We explicitly cast rows to our types. In a full app, we would use Zod for validation.
            wbs: wbsTable ? wbsTable.rows as any : [],
            activities: taskTable ? taskTable.rows as any : [],
            relationships: relationTable ? relationTable.rows as any : []
        };
    }
}