import { YoutubeLogo } from '@phosphor-icons/react';
import PlatformDownloader from './PlatformDownloader';

export default function YouTubeDownloader({ onBack }: { onBack: () => void }) {
  return (
    <PlatformDownloader
      platform="youtube"
      icon={<YoutubeLogo className="w-7 h-7 text-red-500" />}
      description="Download public YouTube videos, shorts, and music. Paste a URL to get started."
    />
  );
}
