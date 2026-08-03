import React, { useEffect } from 'react';
import type { ProcessingType } from '../types';

interface SeoManagerProps {
  toolId: string | null;
  toolTitle?: string;
  toolDescription?: string;
  category?: string;
  isIndexable: boolean;
  processingType?: ProcessingType;
}

export const SeoManager: React.FC<SeoManagerProps> = ({
  toolId,
  toolTitle,
  toolDescription,
  category,
  isIndexable,
  processingType,
}) => {
  useEffect(() => {
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }

    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }

    const existingScript = document.getElementById('panutility-jsonld');
    if (existingScript) {
      existingScript.remove();
    }

    if (toolId && toolTitle && toolDescription) {
      const titleText = `${toolTitle} - Free Client-Side Tool | PanUtility`;
      document.title = titleText;
      
      const processingCopy = processingType === 'browser'
        ? 'Processed locally in your browser.'
        : processingType === 'server'
          ? 'This operation sends data to PanUtility’s server.'
          : processingType === 'external'
            ? 'This operation uses a third-party provider.'
            : 'Processing is currently unavailable.';
      const descText = `${toolDescription} ${processingCopy}`;
      metaDescription.setAttribute('content', descText);
      metaRobots.setAttribute('content', isIndexable ? 'index,follow' : 'noindex,nofollow');
      
      const keywordText = `${toolTitle.toLowerCase()}, in-browser ${toolTitle.toLowerCase()}, offline ${toolTitle.toLowerCase()}, secure utility`;
      metaKeywords.setAttribute('content', keywordText);

      const schemaData = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": toolTitle,
        "operatingSystem": "Web Browser",
        "applicationCategory": category || "UtilityApplication",
        "description": toolDescription,
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "browserRequirements": "Requires HTML5 compatible web browser"
      };

      if (isIndexable) {
        const script = document.createElement('script');
        script.id = 'panutility-jsonld';
        script.type = 'application/ld+json';
        script.text = JSON.stringify(schemaData);
        document.head.appendChild(script);
      }

    } else {
      document.title = "PanUtility - Universal Media & Format Workstation";
      metaDescription.setAttribute('content', "A transparent all-in-one utility catalog with clear availability and browser, server, or third-party processing labels.");
      metaKeywords.setAttribute('content', "utility tools, browser media converter, pdf compiler, audio tools, qr code generator");
      metaRobots.setAttribute('content', 'index,follow');
    }
  }, [toolId, toolTitle, toolDescription, category, isIndexable, processingType]);

  return null;
};
