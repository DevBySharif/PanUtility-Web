import { TiktokLogo } from '@phosphor-icons/react';
import PlatformDownloader from './PlatformDownloader';

export default function TikTokDownloader({ onBack }: { onBack: () => void }) {
  return (
    <PlatformDownloader
      platform="tiktok"
      icon={<TiktokLogo className="w-7 h-7 text-cyan-400" />}
      description="Download public TikTok videos. Paste a URL to get started."
    />
  );
}
