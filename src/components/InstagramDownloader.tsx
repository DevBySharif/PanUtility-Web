import { InstagramLogo } from '@phosphor-icons/react';
import PlatformDownloader from './PlatformDownloader';

export default function InstagramDownloader({ onBack }: { onBack: () => void }) {
  return (
    <PlatformDownloader
      platform="instagram"
      icon={<InstagramLogo className="w-7 h-7 text-pink-500" />}
      description="Download public Instagram reels, posts, and stories. Paste a URL to get started."
    />
  );
}
