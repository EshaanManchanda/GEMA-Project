import React from 'react';
import PartnershipList from '../../components/admin/PartnershipList';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

const AdminPartnershipsPage: React.FC = () => {
  return (
    <>
      <PrivatePageSEO title="Admin - Partnerships | Kidrove" description="Manage business partnerships" />
      <PartnershipList />
    </>
  );
};

export default AdminPartnershipsPage;
