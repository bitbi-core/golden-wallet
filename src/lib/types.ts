export interface ScanProgress {
    duration?: number;
    progress: number;
}

export interface ImportDescriptorItem {
    desc: string;
    active: boolean;
    internal: boolean;
    timestamp: number;
} 