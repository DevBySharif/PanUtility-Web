import { FacebookLogo } from '@phosphor-icons/react';
import PlatformDownloader from './PlatformDownloader';

export default function FacebookDownloader({ onBack }: { onBack: () => void }) {
  return (
    <PlatformDownloader
      platform="facebook"
      icon={<FacebookLogo className="w-7 h-7 text-blue-500" />}
      description="Download public Facebook videos and reels. Paste a URL to get started."
    />
  );
}
