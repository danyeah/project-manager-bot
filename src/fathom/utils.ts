export function extractFathomRecordingId(url: string): string | null {
  const match = url.match(/fathom\.video\/calls\/(\d+)/);
  return match ? match[1] : null;
}

export function formatTranscript(segments: any[]): string {
  if (!segments || segments.length === 0) {
    return '_Nessun transcript disponibile_';
  }

  return segments
    .map((seg) => {
      const time = seg.timestamp 
        ? `[${Math.floor(seg.timestamp / 60)}:${(seg.timestamp % 60).toString().padStart(2, '0')}]` 
        : '';
      return `**${seg.speaker_name || 'Speaker'}** ${time}\n${seg.text}\n`;
    })
    .join('\n');
}

export function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}
