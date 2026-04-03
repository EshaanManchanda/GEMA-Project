import React from 'react';
import SEO from './SEO';
import { getAppNameFull } from '../../utils/brandConfig';

export interface PrivatePageSEOProps {
  title?: string;
  description?: string;
}

/**
 * PrivatePageSEO Component
 *
 * Reusable SEO component for all private/transactional pages that should NOT be indexed by search engines.
 * This includes auth pages, dashboards, admin panels, vendor panels, and checkout/payment pages.
 *
 * Always sets noIndex={true} and noFollow={true} to prevent Google from indexing sensitive pages.
 *
 * @param title - Custom page title (optional). Defaults based on page type.
 * @param description - Custom meta description (optional). Generic default provided.
 */
const PrivatePageSEO: React.FC<PrivatePageSEOProps> = ({
  title,
  description
}) => {
  const appName = getAppNameFull();

  // Default values for private pages
  const defaultTitle = title || `${appName} - Account Dashboard`;
  const defaultDescription = description || 'Secure account dashboard and settings.';

  return (
    <SEO
      title={defaultTitle}
      description={defaultDescription}
      noIndex={true}
      noFollow={true}
    />
  );
};

export default PrivatePageSEO;
