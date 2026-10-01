declare module 'piexifjs' {
  export interface IExifElement {
    '0th'?: Record<number, any>;
    Exif?: Record<number, any>;
    GPS?: Record<number, any>;
    Interop?: Record<number, any>;
    '1st'?: Record<number, any>;
    thumbnail?: string | null;
  }

  export function load(data: string): IExifElement;
  export function dump(exifObj: IExifElement): string;
  export function insert(exifBytes: string, jpegBytes: string): string;
  export function remove(jpegBytes: string): string;

  export const ImageIFD: Record<string, number>;
  export const ExifIFD: Record<string, number>;
  export const GPSIFD: Record<string, number>;
  export const InteropIFD: Record<string, number>;
  export const TAGS: Record<string, Record<number, { name: string; type: string }>>;

  export const GPSHelper: {
    degToDmsRational: (deg: number) => [[number, number], [number, number], [number, number]];
    dmsRationalToDeg: (dmsArray: any[], ref: string) => number;
  };
}
