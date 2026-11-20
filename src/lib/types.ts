export type SeverityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PrivacyIssue {
  id: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  tagKey: string;
  value: string | number | boolean;
  category: 'GPS' | 'DEVICE' | 'PERSONAL' | 'SOFTWARE';
}

export interface PrivacyRiskReport {
  inspectionWarning?: string;
  score: number; // 0 (safe) to 100 (critical risk)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  issues: PrivacyIssue[];
  hasGps: boolean;
  hasDeviceSerial: boolean;
  hasPersonalInfo: boolean;
  hasSoftwareInfo: boolean;
}

export interface AiWorkflowInfo {
  detected: boolean;
  type: 'ComfyUI' | 'Stable Diffusion' | 'Midjourney' | 'DALL-E' | 'None';
  rawWorkflow: string | null;
  prompt?: string;
  negativePrompt?: string;
  sampler?: string;
  steps?: number;
  cfg?: number;
  seed?: string;
  model?: string;
}

/**
 * C2PA: Content Credentials manifest. SOURCE_TYPE: IPTC digital source type. AI_FIELD: IPTC AI properties or an AIGC label.
 * GENERATOR: software fields naming an AI tool. PROMPT: prompts, parameters, or workflow graphs. HISTORY: AI steps in edit history.
 * DISCLOSURE: captions, keywords, or comments that say the image is AI-made.
 */
export type AiSignalKind = 'C2PA' | 'SOURCE_TYPE' | 'AI_FIELD' | 'GENERATOR' | 'PROMPT' | 'HISTORY' | 'DISCLOSURE';

export interface AiSignal {
  id: string;
  kind: AiSignalKind;
  label: string;
  detail: string;
  /** Where the signal is stored, for example "XMP DigitalSourceType" or "JPEG APP11 (JUMBF)". */
  locations: string[];
  /** Standard signals that social platforms read to show "AI info" or "Made with AI" labels. */
  triggersLabel: boolean;
}

export interface AiProvenanceReport {
  /** LABELED: carries standard AI label signals. TRACES: other AI metadata. CLEAN: none found. */
  status: 'LABELED' | 'TRACES' | 'CLEAN';
  signals: AiSignal[];
  generator?: string;
  sourceType?: string;
}

export type AiCleanLevel = 'ai' | 'private' | 'all';

export interface SeoMetadata {
  title?: string;
  caption?: string;
  altText?: string;
  keywords?: string[];
  slug?: string;
  privacyFlags?: {
    containsFaces?: boolean;
    containsIdentifiableText?: boolean;
  };
}

export interface MetadataHistoryItem {
  id: string;
  timestamp: number;
  actor: 'User' | 'AI' | 'System' | 'Preset';
  action: string;
  diffSummary: string;
  previousRaw?: Record<string, any>;
  previousBlob?: Blob | null;
  previousSeo?: SeoMetadata;
  previousName?: string;
}

export interface MetaFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  width?: number;
  height?: number;
  originalBlob: Blob;
  modifiedBlob: Blob | null;
  thumbnailUrl: string;
  rawMetadata: {
    file?: Record<string, any>;
    exif?: Record<string, any>;
    iptc?: Record<string, any>;
    xmp?: Record<string, any>;
    gps?: Record<string, any>;
    makerNote?: Record<string, any>;
    icc?: Record<string, any>;
    jfif?: Record<string, any>;
    [key: string]: any;
  };
  aiWorkflow: AiWorkflowInfo;
  aiProvenance: AiProvenanceReport;
  seoData: SeoMetadata;
  privacyReport: PrivacyRiskReport;
  rawHexSample?: string;
  isDirty?: boolean;
  history: MetadataHistoryItem[];
  sourceTags?: Record<string, 'Camera' | 'User' | 'AI' | 'Preset' | 'System'>;
}

export interface MetadataPreset {
  id: string;
  name: string;
  category: 'SEO' | 'Photography' | 'E-commerce' | 'Stock' | 'Privacy' | 'Custom';
  description: string;
  tags: {
    artist?: string;
    copyright?: string;
    credit?: string;
    headline?: string;
    caption?: string;
    keywords?: string[];
  };
  stripGps: boolean;
  stripSerials: boolean;
  filenameTemplate?: string;
}

export type JobStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface BatchJob {
  id: string;
  name: string;
  type: 'STRIP_GPS' | 'SANITIZE_SOCIAL' | 'APPLY_PRESET' | 'AI_SEO' | 'REMOVE_AI' | 'RENAME' | 'EXPORT_ZIP';
  status: JobStatus;
  total: number;
  completed: number;
  failed: number;
  progress: number; // 0 - 100
  createdAt: number;
  errors: string[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
  timestamp: number;
}

export type AppView = 'studio' | 'dashboard' | 'ai-labels' | 'compare' | 'presets' | 'jobs' | 'batch';
export type ImageGridViewMode = 'grid' | 'list' | 'compact' | 'preview';
