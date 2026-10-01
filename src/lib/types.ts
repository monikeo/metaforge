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

export interface SeoMetadata {
  title?: string;
  caption?: string;
  altText?: string;
  keywords?: string[];
  privacyFlags?: {
    containsFaces?: boolean;
    containsIdentifiableText?: boolean;
  };
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
  seoData: SeoMetadata;
  privacyReport: PrivacyRiskReport;
  rawHexSample?: string;
  isDirty?: boolean;
}
