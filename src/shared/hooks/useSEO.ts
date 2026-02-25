import { useEffect } from 'react';

interface SEOProps {
    title: string;
    description: string;
}

export const useSEO = ({ title, description }: SEOProps) => {
    useEffect(() => {
        // Update Document Title
        const fullTitle = `${title} | Tracker Financiero`;
        document.title = fullTitle;

        // Update Meta Description
        let metaDescription = document.querySelector('meta[name="description"]');

        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.setAttribute('name', 'description');
            document.head.appendChild(metaDescription);
        }

        metaDescription.setAttribute('content', description);

        // Optional: OGP tags for better social sharing
        let ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', fullTitle);

        let ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription) ogDescription.setAttribute('content', description);

    }, [title, description]);
};

export default useSEO;
