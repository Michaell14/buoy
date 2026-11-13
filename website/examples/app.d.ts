// The pretend app the React samples on the examples page are written against: the data they are
// handed and the calls they make to it. check-samples.mjs type-checks every sample against these,
// so a sample that uses buoy-ui wrongly fails the site build.

interface Item {
  name: string;
  price: number;
}
interface Thread {
  id: string;
  from: string;
  subject: string;
}
interface Order {
  id: string;
  total: string;
}
interface Profile {
  name: string;
}
interface Report {
  id: string;
}
interface ExportedFile {
  name: string;
  size: string;
}
interface Track {
  id: string;
  title: string;
  artist: string;
}
interface PlayerProps {
  track: Track;
  playing: boolean;
  onToggle: () => void;
}
interface ImportSummary {
  added: number;
  updated: number;
}
/** The import sample's props. */
interface Props {
  file: File;
  onImported: (summary: ImportSummary) => void;
}

declare function formatPrice(amount: number): string;
declare function checkOut(): void;
declare function sendInvite(email: string): void;
declare function archiveOnServer(ids: string[]): void;
declare function saveProfile(data: FormData): Promise<void>;
declare function charge(order: Order): Promise<void>;
declare function exportReport(report: Report): Promise<ExportedFile>;
declare function openFile(file: ExportedFile): void;
declare function revealFile(file: ExportedFile): void;
declare function openImport(
  file: File,
  options: { resume: boolean },
): Promise<{
  steps(signal: AbortSignal): AsyncIterable<{ done: number; total: number }>;
  summary: ImportSummary;
}>;
