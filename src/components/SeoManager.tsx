import React, { useEffect } from 'react';

interface SeoManagerProps {
  toolId: string | null;
  toolTitle?: string;
  toolDescription?: string;
  category?: string;
}

export const SeoManager: React.FC<SeoManagerProps> = ({
  toolId,
  toolTitle,
  toolDescription,
  category
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

    const existingScript = document.getElementById('panutility-jsonld');
    if (existingScript) {
      existingScript.remove();
    }

    if (toolId && toolTitle && toolDescription) {
      const titleText = `${toolTitle} - Free Client-Side Tool | PanUtility`;
      document.title = titleText;
      
      const descText = `${toolDescription} Run this utility safely in-browser with zero server uploads on PanUtility.`;
      metaDescription.setAttribute('content', descText);
      
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

      const script = document.createElement('script');
      script.id = 'panutility-jsonld';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schemaData);
      document.head.appendChild(script);

    } else {
      document.title = "PanUtility - Universal Media & Format Workstation";
      metaDescription.setAttribute('content', "Free, secure, all-in-one browser-based utility toolbox. Run video splitting, image converting, audio trimming, and text processing safely in-browser with zero server uploads.");
      metaKeywords.setAttribute('content', "offline utility tools, in-browser media converter, offline video splitter, local pdf compiler, client-side audio trimmer, secure qr code generator");
    }
  }, [toolId, toolTitle, toolDescription, category]);

  return null;
};
