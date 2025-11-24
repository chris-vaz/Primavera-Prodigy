// The raw table structure returned by the parser
export interface XERTable {
    name: string;
    columns: string[];
    rows: Record<string, string>[];
}

// The Clean, Application-Ready Data Structure
export interface P6Project {
    meta: {
        exportDate: Date;
        user: string;
    };
    project: {
        id: string;
        shortName: string; // proj_short_name
        name: string;      // project_name
    };
    wbs: P6WBSNode[];
    activities: P6Activity[];
    relationships: P6Relationship[];
}

export interface P6WBSNode {
    wbs_id: string;
    proj_id: string;
    wbs_short_name: string;
    wbs_name: string;
    parent_wbs_id: string;
}

export interface P6Activity {
    task_id: string;      // The internal DB ID
    proj_id: string;
    wbs_id: string;
    task_code: string;    // The Activity ID (e.g., A1000)
    task_name: string;
    status_code: string;  // TK_Active, TK_NotStart, etc.
    total_float: number;
    target_start_date: string;
    target_end_date: string;
    early_start_date: string;
    early_end_date: string;
}

export interface P6Relationship {
    pred_task_id: string;
    task_id: string;      // The Successor
    pred_type: string;    // FS, SS, FF, SF
    lag_hr: number;
}